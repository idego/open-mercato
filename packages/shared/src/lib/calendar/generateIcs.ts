import { formatIcsDate, formatIcsDateUtc } from './formatIcsDate'

export interface IcsParams {
  uid: string
  title: string
  start: Date
  durationMinutes: number
  description: string
  url: string
  timezone: string
  /** Pre-formatted local datetime string (YYYYMMDDTHHmmss). When supplied, skips Date→timezone conversion. */
  dtstart?: string
  /** Pre-formatted local datetime string (YYYYMMDDTHHmmss). When supplied, skips Date→timezone conversion. */
  dtend?: string
}

/** Escapes a text value per RFC 5545 §3.3.11 (TEXT type). */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/** Folds a long line per RFC 5545 §3.1 (max 75 octets per line, continuation with CRLF+SPACE). */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = [line.slice(0, 75)]
  let pos = 75
  while (pos < line.length) {
    parts.push(' ' + line.slice(pos, pos + 74))
    pos += 74
  }
  return parts.join('\r\n')
}

export function generateIcsContent(params: IcsParams): string {
  const { uid, title, start, durationMinutes, description, url, timezone } = params
  const now = new Date()

  const startFormatted = params.dtstart ?? formatIcsDate(start, timezone)
  const endFormatted = (() => {
    if (params.dtend) return params.dtend
    const end = new Date(start.getTime() + durationMinutes * 60_000)
    return formatIcsDate(end, timezone)
  })()

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Open Mercato//calendar-export//EN',
    'BEGIN:VEVENT',
    `UID:${uid}@openmercato`,
    `DTSTAMP:${formatIcsDateUtc(now)}`,
    `DTSTART;TZID=${timezone}:${startFormatted}`,
    `DTEND;TZID=${timezone}:${endFormatted}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.map(foldLine).join('\r\n')
}
