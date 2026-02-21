import { formatIcsDate, formatIcsDateUtc } from './formatIcsDate'

export interface IcsParams {
  uid: string
  title: string
  start: Date
  durationMinutes: number
  description: string
  url: string
  timezone: string
}

export function generateIcsContent(params: IcsParams): string {
  const { uid, title, start, durationMinutes, description, url, timezone } = params
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  const now = new Date()

  const escapedDescription = description.replace(/\n/g, '\\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Open Mercato//calendar-export//EN',
    'BEGIN:VEVENT',
    `UID:${uid}@openmercato`,
    `DTSTAMP:${formatIcsDateUtc(now)}`,
    `DTSTART;TZID=${timezone}:${formatIcsDate(start, timezone)}`,
    `DTEND;TZID=${timezone}:${formatIcsDate(end, timezone)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${escapedDescription}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.join('\r\n')
}
