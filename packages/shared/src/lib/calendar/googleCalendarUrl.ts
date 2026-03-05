export interface GoogleCalParams {
  title: string
  start: Date
  durationMinutes: number
  description: string
  timezone: string
}

export function buildGoogleCalendarUrl(params: GoogleCalParams): string {
  const { title, start, durationMinutes, description, timezone } = params
  const end = new Date(start.getTime() + durationMinutes * 60_000)

  const formatUtcCompact = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return (
      `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
      `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
    )
  }

  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatUtcCompact(start)}/${formatUtcCompact(end)}`,
    ctz: timezone,
    details: description,
  })

  return `https://calendar.google.com/calendar/render?${query.toString()}`
}
