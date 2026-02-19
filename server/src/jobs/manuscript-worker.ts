import * as jobQueue from '../db/queries/jobQueue.js'
import * as manuscriptQuery from '../db/queries/manuscripts.js'
import * as sourceQuery from '../db/queries/sources.js'
import { generate, type GeneratePayload } from '../services/manuscriptGenerator.js'

const JOB_TYPE = 'manuscript_generation'
const POLL_INTERVAL_MS = 3_000
let isRunning = false
let timer: ReturnType<typeof setTimeout> | null = null

export function startManuscriptWorker() {
  console.log('[manuscript-worker] started')
  poll()
}

export function stopManuscriptWorker() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

async function poll() {
  if (isRunning) {
    timer = setTimeout(poll, POLL_INTERVAL_MS)
    return
  }

  try {
    isRunning = true
    const job = await jobQueue.claimNextPending(JOB_TYPE)

    if (job) {
      console.log(`[manuscript-worker] processing job #${job.id}`)
      await processJob(job)
    }
  } catch (err) {
    console.error('[manuscript-worker] poll error:', err)
  } finally {
    isRunning = false
    timer = setTimeout(poll, POLL_INTERVAL_MS)
  }
}

async function processJob(job: jobQueue.JobRow) {
  const payload = job.payload as unknown as GeneratePayload

  try {
    await generate(payload)
    await jobQueue.markCompleted(job.id)
    console.log(`[manuscript-worker] job #${job.id} completed (manuscript #${payload.manuscriptId})`)
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    console.error(`[manuscript-worker] job #${job.id} failed:`, message)

    if (job.attempts >= job.max_attempts) {
      await jobQueue.markFailed(job.id, message)
      await manuscriptQuery.updateStatus(payload.manuscriptId, 'failed').catch(() => {})
      await sourceQuery.removeWorker(payload.sourceId, payload.userId).catch(() => {})
    } else {
      await jobQueue.markFailed(job.id, message)
      await jobQueue.requeueFailed(job.id)
    }
  }
}
