import 'dotenv/config'
import app from './app.js'
import { startCrawlScheduler } from './jobs/crawl-scheduler.js'
import { startManuscriptWorker } from './jobs/manuscript-worker.js'
import { startPerformanceScheduler } from './jobs/performance-scheduler.js'

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`)
  startCrawlScheduler()
  startManuscriptWorker()
  startPerformanceScheduler()
})
