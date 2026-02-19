import cron from 'node-cron'
import { runCrawl } from '../services/crawler.js'

let isRunning = false

async function executeCrawl() {
  if (isRunning) {
    console.log('[scheduler] 이전 크롤링이 진행 중 — 이번 주기 건너뜀')
    return
  }

  isRunning = true
  try {
    await runCrawl()
  } catch (err) {
    console.error('[scheduler] 크롤링 실행 오류:', (err as Error).message)
  } finally {
    isRunning = false
  }
}

export function startCrawlScheduler() {
  // 매시 정각 실행
  cron.schedule('0 * * * *', () => {
    console.log('[scheduler] 정기 크롤링 시작')
    executeCrawl()
  })

  console.log('[scheduler] 크롤링 스케줄러 등록 (매시 정각)')

  // 서버 시작 시 첫 크롤링 (10초 후)
  setTimeout(() => {
    console.log('[scheduler] 초기 크롤링 실행')
    executeCrawl()
  }, 10_000)
}
