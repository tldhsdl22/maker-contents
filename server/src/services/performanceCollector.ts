import * as performanceQuery from '../db/queries/performance.js'

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
    const isAccessible = Math.random() > 0.05

    const nextViews = isAccessible
      ? (latest?.view_count ?? getRandomInt(50, 200)) + getRandomInt(5, 60)
      : null
    const nextComments = isAccessible
      ? (latest?.comment_count ?? getRandomInt(0, 5)) + getRandomInt(0, 3)
      : null
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
