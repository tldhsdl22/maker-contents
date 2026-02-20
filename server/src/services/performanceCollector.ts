import axios from 'axios'
import * as performanceQuery from '../db/queries/performance.js'

const NAVER_BLOG_SEARCH_API = 'https://openapi.naver.com/v1/search/blog.json'
const NAVER_CAFE_SEARCH_API = 'https://openapi.naver.com/v1/search/cafearticle.json'
const MAX_SEARCH_RESULTS = 300

type NaverSearchKey = {
  clientId: string
  clientSecret: string
}

type NaverSearchResponse = {
  total: number
  start: number
  display: number
  items: Array<{ link: string }>
}

let searchKeyPool: NaverSearchKey[] | null = null
let searchKeyIndex = 0
let warnedMissingKeys = false

function parseKeyList(raw?: string): string[] {
  if (!raw) return []
  return raw.split(',').map(value => value.trim()).filter(Boolean)
}

function loadSearchKeyPool() {
  if (searchKeyPool) return searchKeyPool
  const ids = parseKeyList(process.env.NAVER_SEARCH_CLIENT_IDS || process.env.NAVER_SEARCH_CLIENT_ID)
  const secrets = parseKeyList(process.env.NAVER_SEARCH_CLIENT_SECRETS || process.env.NAVER_SEARCH_CLIENT_SECRET)
  const count = Math.min(ids.length, secrets.length)

  searchKeyPool = Array.from({ length: count }, (_, idx) => ({
    clientId: ids[idx],
    clientSecret: secrets[idx],
  }))

  if (!searchKeyPool.length && !warnedMissingKeys) {
    console.warn('[performance] 네이버 검색 API 키가 설정되지 않았습니다.')
    warnedMissingKeys = true
  }

  return searchKeyPool
}

function getNextSearchKey(): NaverSearchKey | null {
  const pool = loadSearchKeyPool()
  if (!pool.length) return null
  const key = pool[searchKeyIndex % pool.length]
  searchKeyIndex = (searchKeyIndex + 1) % pool.length
  return key
}

function extractCafeIdentifiers(rawUrl: string): { cafeKey: string; articleId: string; useCafeId: boolean } | null {
  try {
    const url = new URL(rawUrl)

    if (url.hostname === 'article.cafe.naver.com') {
      const segments = url.pathname.split('/').filter(Boolean)
      const cafesIndex = segments.indexOf('cafes')
      const articlesIndex = segments.indexOf('articles')
      if (cafesIndex === -1 || articlesIndex === -1) return null
      const cafeKey = segments[cafesIndex + 1]
      const articleId = segments[articlesIndex + 1]
      if (!cafeKey || !articleId) return null
      const useCafeId = /^\d+$/.test(cafeKey)
      return { cafeKey, articleId, useCafeId }
    }

    if (url.hostname.endsWith('cafe.naver.com')) {
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length >= 2 && segments[0] !== 'ArticleRead.nhn') {
        const [cafeKey, articleId] = segments
        if (cafeKey && articleId) {
          return { cafeKey, articleId, useCafeId: /^\d+$/.test(cafeKey) }
        }
      }

      if (segments[0] === 'ArticleRead.nhn') {
        const cafeId = url.searchParams.get('clubid')
        const articleId = url.searchParams.get('articleid')
        if (cafeId && articleId) {
          return { cafeKey: cafeId, articleId, useCafeId: true }
        }
      }
    }
  } catch {
    return null
  }

  return null
}

function extractBlogIdentifiers(rawUrl: string): { blogId: string; logNo: string } | null {
  try {
    const url = new URL(rawUrl)
    if (!url.hostname.endsWith('blog.naver.com')) return null

    const blogId = url.searchParams.get('blogId')
    const logNo = url.searchParams.get('logNo')
    if (blogId && logNo) {
      return { blogId, logNo }
    }

    const segments = url.pathname.split('/').filter(Boolean)
    if (segments.length >= 2) {
      const [pathBlogId, pathLogNo] = segments
      if (pathBlogId && pathLogNo) {
        return { blogId: pathBlogId, logNo: pathLogNo }
      }
    }
  } catch {
    return null
  }

  return null
}

function normalizeUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    const hostname = url.hostname.replace(/^m\./, '').toLowerCase()
    const pathname = url.pathname.replace(/\/$/, '').toLowerCase()
    return `${hostname}${pathname}`
  } catch {
    return rawUrl.trim().toLowerCase()
  }
}

function matchBlogUrl(targetUrl: string, candidateUrl: string) {
  const target = extractBlogIdentifiers(targetUrl)
  const candidate = extractBlogIdentifiers(candidateUrl)
  if (target && candidate) {
    return target.blogId === candidate.blogId && target.logNo === candidate.logNo
  }
  return normalizeUrl(targetUrl) === normalizeUrl(candidateUrl)
}

function matchCafeUrl(targetUrl: string, candidateUrl: string) {
  const target = extractCafeIdentifiers(targetUrl)
  const candidate = extractCafeIdentifiers(candidateUrl)
  if (target && candidate) {
    if (target.articleId === candidate.articleId) {
      return target.cafeKey === candidate.cafeKey || target.useCafeId !== candidate.useCafeId
    }
  }
  return normalizeUrl(targetUrl) === normalizeUrl(candidateUrl)
}

async function fetchNaverRank(params: { keyword: string; targetUrl: string; platform: 'blog' | 'cafe' }) {
  const key = getNextSearchKey()
  if (!key) return null

  const endpoint = params.platform === 'blog' ? NAVER_BLOG_SEARCH_API : NAVER_CAFE_SEARCH_API
  const display = 100
  const maxStart = Math.min(MAX_SEARCH_RESULTS, 1000)
  const matchUrl = params.platform === 'blog' ? matchBlogUrl : matchCafeUrl

  for (let start = 1; start <= maxStart; start += display) {
    const response = await axios.get<NaverSearchResponse>(endpoint, {
      params: {
        query: params.keyword,
        start,
        display,
      },
      headers: {
        'X-Naver-Client-Id': key.clientId,
        'X-Naver-Client-Secret': key.clientSecret,
      },
      timeout: 10_000,
    })

    const items = response.data?.items ?? []
    for (let idx = 0; idx < items.length; idx += 1) {
      if (matchUrl(params.targetUrl, items[idx].link)) {
        return start + idx
      }
    }

    if (!items.length || start + items.length > maxStart) {
      break
    }
  }

  return null
}

export async function collectPerformanceData() {
  await performanceQuery.completeExpiredTrackings()

  const now = Date.now()
  const trackings = await performanceQuery.getActiveTrackings()

  let collected = 0

  for (const tracking of trackings) {
    if (new Date(tracking.tracking_end).getTime() <= now) {
      continue
    }

    let nextViews: number | null = null
    let nextComments: number | null = null
    let isAccessible = true
    let nextRank: number | null = null

    if (tracking.keyword && tracking.url) {
      try {
        nextRank = await fetchNaverRank({
          keyword: tracking.keyword,
          targetUrl: tracking.url,
          platform: tracking.platform,
        })
      } catch (err) {
        console.error('[performance] 검색 순위 수집 실패:', (err as Error).message)
        isAccessible = false
      }
    }

    await performanceQuery.insertData({
      tracking_id: tracking.id,
      keyword_rank: nextRank,
      view_count: nextViews,
      comment_count: nextComments,
      is_accessible: isAccessible,
    })

    collected += 1
  }

  return collected
}
