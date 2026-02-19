import axios from 'axios'
import * as cheerio from 'cheerio'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { CRAWL_SITES, DEFAULT_USER_AGENT, type CrawlSiteConfig, type ListPageConfig } from '../config/crawl-sites.js'
import * as sourceQuery from '../db/queries/sources.js'

const UPLOADS_BASE = path.resolve('uploads/sources')

const REQUEST_TIMEOUT = 15_000
const DELAY_BETWEEN_ARTICLES = 1_500

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex')
}

function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).href
  } catch {
    return href
  }
}

/** 쿼리 파라미터·해시 제거 — 같은 기사의 중복 URL 방지 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.search = ''
    u.hash = ''
    return u.href
  } catch {
    return url
  }
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchPage(url: string, userAgent?: string): Promise<string> {
  const res = await axios.get<string>(url, {
    timeout: REQUEST_TIMEOUT,
    headers: {
      'User-Agent': userAgent || DEFAULT_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.3',
      'Referer': 'https://news.naver.com/',
    },
    responseType: 'text',
    maxRedirects: 5,
  })
  return res.data
}

async function downloadImage(imageUrl: string, destDir: string): Promise<string | null> {
  try {
    const res = await axios.get(imageUrl, {
      timeout: REQUEST_TIMEOUT,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Referer': 'https://news.naver.com/',
      },
    })

    const contentType = (res.headers['content-type'] as string) || ''
    let ext = '.jpg'
    if (contentType.includes('png')) ext = '.png'
    else if (contentType.includes('gif')) ext = '.gif'
    else if (contentType.includes('webp')) ext = '.webp'

    const filename = `${crypto.randomUUID()}${ext}`
    const filePath = path.join(destDir, filename)

    await ensureDir(destDir)
    await fs.writeFile(filePath, Buffer.from(res.data))

    return filePath
  } catch (err) {
    console.error(`[crawler] 이미지 다운로드 실패: ${imageUrl}`, (err as Error).message)
    return null
  }
}

// ---------------------------------------------------------------------------
// URL extraction — 목록/랭킹 페이지에서 기사 URL 추출
// ---------------------------------------------------------------------------

function extractUrlsFromRss(xml: string): string[] {
  const $ = cheerio.load(xml, { xmlMode: true })
  const urls: string[] = []

  $('item').each((_, item) => {
    let link = $(item).find('link').text().trim()
    if (!link) {
      const raw = $.html(item)
      const match = raw.match(/<link[^>]*>([^<]+)<\/link>/)
      if (match) link = match[1].trim()
    }
    if (link && link.startsWith('http')) urls.push(link)
  })

  return [...new Set(urls)]
}

function extractUrlsFromHtml(html: string, listPage: ListPageConfig, baseUrl: string): string[] {
  const $ = cheerio.load(html)
  const urls: string[] = []

  $(listPage.linkSelector).each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      const absUrl = resolveUrl(href, baseUrl)
      if (absUrl.startsWith('http')) urls.push(absUrl)
    }
  })

  return [...new Set(urls)]
}

function extractArticleUrls(data: string, listPage: ListPageConfig, baseUrl: string): string[] {
  let urls = listPage.rss
    ? extractUrlsFromRss(data)
    : extractUrlsFromHtml(data, listPage, baseUrl)

  // URL 패턴 필터
  if (listPage.urlPattern) {
    const re = new RegExp(listPage.urlPattern)
    urls = urls.filter(u => re.test(u))
  }

  // 정규화하여 중복 제거 (?ntype=RANKING 등 파라미터 제거)
  const normalized = [...new Set(urls.map(normalizeUrl))]

  // 최대 기사 수 제한
  if (listPage.maxArticles && normalized.length > listPage.maxArticles) {
    return normalized.slice(0, listPage.maxArticles)
  }

  return normalized
}

// ---------------------------------------------------------------------------
// Article parsing — 네이버 뉴스 개별 기사 페이지 파싱
// ---------------------------------------------------------------------------

interface ParsedArticle {
  title: string
  contentHtml: string
  thumbnailUrl: string | null
  imageUrls: string[]
  category: string | null
  sourceSite: string | null
}

function parseArticle(html: string, url: string, site: CrawlSiteConfig): ParsedArticle | null {
  const $ = cheerio.load(html)

  // 제목: CSS 셀렉터 → og:title → <title>
  let title = $(site.article.titleSelector).first().text().trim()
  if (!title) title = $('meta[property="og:title"]').attr('content')?.trim() || ''
  if (!title) title = $('title').text().trim()
  if (!title) {
    console.warn(`[crawler] 제목 추출 실패: ${url}`)
    return null
  }

  // 본문
  const contentEl = $(site.article.contentSelector).first()
  if (contentEl.length === 0) {
    console.warn(`[crawler] 본문 영역 못 찾음: ${url}`)
    return null
  }

  // 이미지 URL 수집 (네이버 lazy loading 대응)
  const imageUrls: string[] = []
  contentEl.find('img').each((_, el) => {
    const src =
      $(el).attr('data-src') ||
      $(el).attr('data-lazy-src') ||
      $(el).attr('data-original') ||
      $(el).attr('src') || ''

    if (src && !src.includes('blank.') && !src.includes('transparent.')) {
      const absUrl = resolveUrl(src, url)
      if (absUrl.startsWith('http')) imageUrls.push(absUrl)
    }
  })

  // 불필요 요소 제거 후 HTML 보존
  contentEl.find('script, style, iframe, .byline, .reporter_area, .copyright, .artice_bottm').remove()
  const contentHtml = contentEl.html()?.trim() || ''

  if (!contentHtml) {
    console.warn(`[crawler] 본문이 비어 있음: ${url}`)
    return null
  }

  // 썸네일: 전용 셀렉터 → og:image → 본문 첫 이미지
  let thumbnailUrl: string | null = null
  if (site.article.thumbnailSelector) {
    const thumbEl = $(site.article.thumbnailSelector).first()
    thumbnailUrl = thumbEl.attr('content') || thumbEl.attr('src') || null
    if (thumbnailUrl) thumbnailUrl = resolveUrl(thumbnailUrl, url)
  }
  if (!thumbnailUrl) {
    thumbnailUrl = $('meta[property="og:image"]').attr('content') || null
    if (thumbnailUrl) thumbnailUrl = resolveUrl(thumbnailUrl, url)
  }
  if (!thumbnailUrl && imageUrls.length > 0) {
    thumbnailUrl = imageUrls[0]
  }

  // 카테고리: 기사 페이지에서 추출 (예: "이 기사는 언론사에서 생활 섹션으로 분류했습니다")
  let category: string | null = null
  if (site.article.categorySelector) {
    category = $(site.article.categorySelector).first().text().trim() || null
  }
  if (!category) {
    const sectionMeta = $('meta[property="article:section"]').attr('content')?.trim()
    if (sectionMeta) category = sectionMeta
  }

  // 출처 (언론사명): 로고 이미지 alt 또는 텍스트
  let sourceSite: string | null = null
  if (site.article.sourceSiteSelector) {
    const el = $(site.article.sourceSiteSelector).first()
    sourceSite = el.attr('alt')?.trim() || el.text()?.trim() || null
  }
  if (!sourceSite) {
    sourceSite = $('meta[property="og:article:author"]').attr('content')?.trim() || null
  }

  return { title, contentHtml, thumbnailUrl, imageUrls, category, sourceSite }
}

// ---------------------------------------------------------------------------
// Main crawl logic
// ---------------------------------------------------------------------------

async function crawlSite(site: CrawlSiteConfig): Promise<number> {
  let newCount = 0

  for (const listPage of site.listPages) {
    try {
      const data = await fetchPage(listPage.url, site.userAgent)
      const articleUrls = extractArticleUrls(data, listPage, listPage.url)

      console.log(`[crawler] ${site.name}: ${articleUrls.length}개 기사 URL 발견`)

      if (articleUrls.length === 0) {
        console.warn(`[crawler] 기사 URL 0개 — 셀렉터/페이지를 확인해 주세요: ${listPage.url}`)
      }

      for (const rawUrl of articleUrls) {
        const articleUrl = normalizeUrl(rawUrl)
        const urlHash = hashUrl(articleUrl)

        const existing = await sourceQuery.findByUrlHash(urlHash)
        if (existing) continue

        try {
          await delay(DELAY_BETWEEN_ARTICLES)

          const articleHtml = await fetchPage(articleUrl, site.userAgent)
          const article = parseArticle(articleHtml, articleUrl, site)
          if (!article) continue

          const category = listPage.category || article.category || '종합'
          const sourceSite = article.sourceSite || site.name

          const sourceId = await sourceQuery.create({
            title: article.title,
            thumbnail_url: article.thumbnailUrl,
            original_url: articleUrl,
            url_hash: urlHash,
            content_html: article.contentHtml,
            category,
            source_site: sourceSite,
          })

          const imageDir = path.join(UPLOADS_BASE, String(sourceId))

          if (article.thumbnailUrl) {
            const localPath = await downloadImage(article.thumbnailUrl, imageDir)
            if (localPath) {
              const relativePath = path.relative(path.resolve('.'), localPath).replace(/\\/g, '/')
              await sourceQuery.updateThumbnailLocalPath(sourceId, relativePath)
            }
          }

          for (const imgUrl of article.imageUrls) {
            const localPath = await downloadImage(imgUrl, imageDir)
            if (localPath) {
              const relativePath = path.relative(path.resolve('.'), localPath).replace(/\\/g, '/')
              await sourceQuery.createImage({
                source_id: sourceId,
                original_url: imgUrl,
                local_path: relativePath,
              })
            }
          }

          newCount++
          console.log(`[crawler] +1 [${sourceSite}/${category}] ${article.title.slice(0, 40)}`)
        } catch (err) {
          console.error(`[crawler] 기사 처리 실패: ${articleUrl}`, (err as Error).message)
        }
      }
    } catch (err) {
      console.error(`[crawler] 목록 페이지 접근 실패: ${listPage.url}`, (err as Error).message)
    }
  }

  return newCount
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runCrawl(): Promise<void> {
  console.log('[crawler] 크롤링 시작...')
  const startTime = Date.now()

  await cleanExpiredSources()

  let totalNew = 0
  for (const site of CRAWL_SITES) {
    try {
      const count = await crawlSite(site)
      totalNew += count
    } catch (err) {
      console.error(`[crawler] ${site.name} 크롤링 실패:`, (err as Error).message)
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[crawler] 크롤링 완료 — 새 기사 ${totalNew}건 (${elapsed}s)`)
}

export async function cleanExpiredSources(): Promise<void> {
  try {
    await sourceQuery.snapshotAndExpire()
    const deleted = await sourceQuery.deleteExpired()
    if (deleted > 0) {
      console.log(`[crawler] 만료 기사 ${deleted}건 삭제`)
    }
  } catch (err) {
    console.error('[crawler] 만료 기사 정리 실패:', (err as Error).message)
  }
}
