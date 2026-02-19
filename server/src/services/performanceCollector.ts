import axios from 'axios'
import * as performanceQuery from '../db/queries/performance.js'

const NAVER_CAFE_API_BASE = 'https://article.cafe.naver.com/gw/v4/cafes'

type CafeMetrics = {
  views: number | null
  comments: number | null
  isAccessible: boolean
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getNextRank(prevRank: number | null) {
  if (Math.random() < 0.2) return null
  if (!prevRank) return getRandomInt(1, 50)
  const delta = getRandomInt(-3, 3)
  return clamp(prevRank + delta, 1, 50)
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

async function fetchCafeMetrics(rawUrl: string): Promise<CafeMetrics | null> {
  const ids = extractCafeIdentifiers(rawUrl)
  if (!ids) return null

  const endpoint = `${NAVER_CAFE_API_BASE}/${ids.cafeKey}/articles/${ids.articleId}`
  const res = await axios.get<{ result?: { article?: { readCount?: number; commentCount?: number; isOpen?: boolean; isReadable?: boolean } } }>(
    endpoint,
    {
      params: { useCafeId: ids.useCafeId ? 'true' : 'false' },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': rawUrl,
      },
      timeout: 10_000,
    }
  )

  const article = res.data?.result?.article
  if (!article) {
    return { views: null, comments: null, isAccessible: false }
  }

  const isAccessible = (article.isOpen ?? true) && (article.isReadable ?? true)

  return {
    views: typeof article.readCount === 'number' ? article.readCount : null,
    comments: typeof article.commentCount === 'number' ? article.commentCount : null,
    isAccessible,
  }
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

    const latest = await performanceQuery.getLatestData(tracking.id)

    let nextViews: number | null = null
    let nextComments: number | null = null
    let isAccessible = true

    if (tracking.platform === 'cafe') {
      try {
        const metrics = await fetchCafeMetrics(tracking.url)
        if (metrics) {
          isAccessible = metrics.isAccessible
          nextViews = metrics.views
          nextComments = metrics.comments
        } else {
          isAccessible = false
        }
      } catch (err) {
        console.error('[performance] 카페 성과 수집 실패:', (err as Error).message)
        isAccessible = false
      }
    } else {
      isAccessible = Math.random() > 0.05
      nextViews = isAccessible
        ? (latest?.view_count ?? getRandomInt(50, 200)) + getRandomInt(5, 60)
        : null
      nextComments = isAccessible
        ? (latest?.comment_count ?? getRandomInt(0, 5)) + getRandomInt(0, 3)
        : null
    }

    const nextRank = isAccessible ? getNextRank(latest?.keyword_rank ?? null) : null

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
