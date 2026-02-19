/**
 * 크롤링 대상 뉴스 사이트 설정.
 *
 * 네이버 뉴스 랭킹 페이지에서 인기 기사 URL을 수집하고,
 * 개별 기사 페이지(n.news.naver.com/article/...)에서 본문을 파싱합니다.
 */

export interface CrawlSiteConfig {
  id: string
  name: string
  baseUrl: string
  listPages: ListPageConfig[]
  article: ArticleSelectors
  userAgent?: string
}

export interface ListPageConfig {
  url: string
  /** 목록 수준 카테고리 (빈 문자열이면 기사 페이지에서 추출) */
  category: string
  linkSelector: string
  rss?: boolean
  /** 추출 URL 중 기사만 남기는 정규식 */
  urlPattern?: string
  /** 한 번에 가져올 최대 기사 수 */
  maxArticles?: number
}

export interface ArticleSelectors {
  titleSelector: string
  contentSelector: string
  thumbnailSelector?: string
  /** 기사 페이지에서 카테고리를 추출하는 셀렉터 */
  categorySelector?: string
  /** 기사 페이지에서 출처(언론사명)를 추출하는 셀렉터 */
  sourceSiteSelector?: string
}

export const CRAWL_SITES: CrawlSiteConfig[] = [
  {
    id: 'naver-ranking',
    name: '네이버 뉴스',
    baseUrl: 'https://news.naver.com',
    listPages: [
      {
        url: 'https://news.naver.com/main/ranking/popularDay.naver',
        category: '',
        linkSelector: 'a[href*="/article/"]',
        urlPattern: 'n\\.news\\.naver\\.com/article/\\d+/\\d+',
        maxArticles: 60,
      },
    ],
    article: {
      titleSelector: 'h2#title_area, h2.media_end_head_headline',
      contentSelector: 'article#dic_area, #newsct_article',
      thumbnailSelector: 'meta[property="og:image"]',
      categorySelector: '.media_end_categorize_item',
      sourceSiteSelector: '.media_end_head_top_logo img',
    },
  },
]

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
