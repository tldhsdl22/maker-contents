import cron from 'node-cron'
import { collectPerformanceData } from '../services/performanceCollector.js'

let isRunning = false

async function executeCollection() {
  if (isRunning) {
    console.log('[performance] 이전 수집이 진행 중 — 이번 주기 건너뜀')
    return
  }

  isRunning = true
  try {
    const count = await collectPerformanceData()
    console.log(`[performance] 성과 데이터 수집 완료 (${count}건)`)
  } catch (err) {
    console.error('[performance] 성과 수집 오류:', (err as Error).message)
  } finally {
    isRunning = false
  }
}

export function startPerformanceScheduler() {
  // 매시 정각 실행
  cron.schedule('0 * * * *', () => {
    console.log('[performance] 정기 성과 수집 시작')
    executeCollection()
  })

  console.log('[performance] 성과 수집 스케줄러 등록 (매시 정각)')

  // 서버 시작 시 첫 수집 (15초 후)
  setTimeout(() => {
    console.log('[performance] 초기 성과 수집 실행')
    executeCollection()
  }, 15_000)
}
