import { generateIcsContent, IcsParams } from '../generateIcs'

const baseParams: IcsParams = {
  uid: 'test-uid-123',
  title: 'Follow-up: Deal Name',
  start: new Date('2026-02-22T08:00:00Z'),
  durationMinutes: 30,
  description: 'Deal: Deal Name\nStage: Negotiation',
  url: 'https://app.example.com/deals/abc123',
  timezone: 'Europe/Warsaw',
}

describe('generateIcsContent', () => {
  it('starts with BEGIN:VCALENDAR and ends with END:VCALENDAR', () => {
    const result = generateIcsContent(baseParams)
    expect(result).toMatch(/^BEGIN:VCALENDAR/)
    expect(result).toMatch(/END:VCALENDAR$/)
  })

  it('contains UID with @openmercato suffix', () => {
    const result = generateIcsContent(baseParams)
    expect(result).toContain('UID:test-uid-123@openmercato')
  })

  it('contains DTSTART with correct TZID and local time', () => {
    const result = generateIcsContent(baseParams)
    // 2026-02-22T08:00:00Z = 09:00:00 in Europe/Warsaw (UTC+1 winter)
    expect(result).toContain('DTSTART;TZID=Europe/Warsaw:20260222T090000')
  })

  it('contains DTEND = start + durationMinutes', () => {
    const result = generateIcsContent(baseParams)
    // 09:00 + 30 min = 09:30 in Europe/Warsaw
    expect(result).toContain('DTEND;TZID=Europe/Warsaw:20260222T093000')
  })

  it('calculates DTEND correctly for 1h duration', () => {
    const result = generateIcsContent({ ...baseParams, durationMinutes: 60 })
    expect(result).toContain('DTEND;TZID=Europe/Warsaw:20260222T100000')
  })

  it('contains SUMMARY with the title', () => {
    const result = generateIcsContent(baseParams)
    expect(result).toContain('SUMMARY:Follow-up: Deal Name')
  })

  it('escapes newlines in description as \\n', () => {
    const result = generateIcsContent(baseParams)
    expect(result).toContain('DESCRIPTION:Deal: Deal Name\\nStage: Negotiation')
    expect(result).not.toContain('DESCRIPTION:Deal: Deal Name\nStage: Negotiation')
  })

  it('contains URL', () => {
    const result = generateIcsContent(baseParams)
    expect(result).toContain('URL:https://app.example.com/deals/abc123')
  })

  it('uses CRLF line endings', () => {
    const result = generateIcsContent(baseParams)
    expect(result).toContain('\r\n')
    const lines = result.split('\r\n')
    expect(lines.length).toBeGreaterThan(5)
  })

  it('contains DTSTAMP in UTC format with Z suffix', () => {
    const fixedNow = new Date('2026-02-21T10:00:00Z')
    const realDate = global.Date
    global.Date = class extends realDate {
      constructor(...args: ConstructorParameters<typeof realDate>) {
        if (args.length === 0) {
          super(fixedNow.getTime())
        } else {
          // @ts-expect-error spread args
          super(...args)
        }
      }
    } as typeof Date

    try {
      const result = generateIcsContent(baseParams)
      expect(result).toContain('DTSTAMP:20260221T100000Z')
    } finally {
      global.Date = realDate
    }
  })

  it('contains required VCALENDAR headers', () => {
    const result = generateIcsContent(baseParams)
    expect(result).toContain('VERSION:2.0')
    expect(result).toContain('PRODID:-//Open Mercato//calendar-export//EN')
  })

  it('wraps VEVENT correctly', () => {
    const result = generateIcsContent(baseParams)
    expect(result).toContain('BEGIN:VEVENT')
    expect(result).toContain('END:VEVENT')
  })

  it('uses dtstart/dtend overrides when provided, ignoring Date conversion', () => {
    const result = generateIcsContent({
      ...baseParams,
      dtstart: '20260222T090000',
      dtend: '20260222T093000',
    })
    expect(result).toContain('DTSTART;TZID=Europe/Warsaw:20260222T090000')
    expect(result).toContain('DTEND;TZID=Europe/Warsaw:20260222T093000')
  })

  it('escapes backslash in title', () => {
    const result = generateIcsContent({ ...baseParams, title: 'Deal\\Name' })
    expect(result).toContain('SUMMARY:Deal\\\\Name')
  })

  it('escapes comma in title', () => {
    const result = generateIcsContent({ ...baseParams, title: 'Smith, John' })
    expect(result).toContain('SUMMARY:Smith\\, John')
  })

  it('escapes semicolon in title', () => {
    const result = generateIcsContent({ ...baseParams, title: 'A;B' })
    expect(result).toContain('SUMMARY:A\\;B')
  })

  it('escapes CRLF in title to prevent ICS injection', () => {
    const result = generateIcsContent({
      ...baseParams,
      title: 'foo\r\nBEGIN:VEVENT\r\nUID:injected',
    })
    expect(result).not.toContain('BEGIN:VEVENT\r\nUID:injected')
    expect(result).toContain('SUMMARY:foo\\nBEGIN:VEVENT\\nUID:injected')
  })

  it('folds lines longer than 75 characters', () => {
    const longTitle = 'A'.repeat(80)
    const result = generateIcsContent({ ...baseParams, title: longTitle })
    const summaryLine = result.split('\r\n').find((l) => l.startsWith('SUMMARY:'))
    expect(summaryLine).toBeDefined()
    expect((summaryLine ?? '').length).toBeLessThanOrEqual(75)
    expect(result).toContain('\r\n ')
  })
})
