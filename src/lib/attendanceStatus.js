export const PRESENT_GRACE_MIN = 10   // Present until 10 min after start
export const DEFAULT_EVENT_HOURS = 2  // used if the event has no ends_at

export function getStatusForScan(startsAt, scannedAt = new Date()) {
  if (!startsAt) return 'Present'
  const minutesAfterStart = (new Date(scannedAt) - new Date(startsAt)) / 60000
  return minutesAfterStart <= PRESENT_GRACE_MIN ? 'Present' : 'Late'
}

export function getEventEnd(event) {
  if (!event) return null
  return event.ends_at
    ? new Date(event.ends_at)
    : new Date(new Date(event.starts_at).getTime() + DEFAULT_EVENT_HOURS * 3600000)
}