import { formatIcsDate, formatIcsDateUtc } from '../formatIcsDate'

describe('formatIcsDate', () => {
  it('formats a UTC date in Europe/Warsaw timezone', () => {
    // 2026-02-22T08:00:00Z = 09:00:00 in Europe/Warsaw (UTC+1 in winter)
    const date = new Date('2026-02-22T08:00:00Z')
    expect(formatIcsDate(date, 'Europe/Warsaw')).toBe('20260222T090000')
  })

  it('formats the same date differently in America/New_York', () => {
    // 2026-02-22T08:00:00Z = 03:00:00 in America/New_York (UTC-5 in winter)
    const date = new Date('2026-02-22T08:00:00Z')
    expect(formatIcsDate(date, 'America/New_York')).toBe('20260222T030000')
  })

  it('handles DST transition correctly in Europe/Warsaw (summer time)', () => {
    // 2026-07-15T10:00:00Z = 12:00:00 in Europe/Warsaw (UTC+2 in summer)
    const date = new Date('2026-07-15T10:00:00Z')
    expect(formatIcsDate(date, 'Europe/Warsaw')).toBe('20260715T120000')
  })

  it('handles midnight UTC crossing a day boundary in UTC+5', () => {
    // 2026-03-01T23:00:00Z = 2026-03-02T04:00:00 in Asia/Karachi (UTC+5)
    const date = new Date('2026-03-01T23:00:00Z')
    expect(formatIcsDate(date, 'Asia/Karachi')).toBe('20260302T040000')
  })

  it('returns a string without dashes, colons or Z suffix', () => {
    const date = new Date('2026-06-15T14:30:00Z')
    const result = formatIcsDate(date, 'UTC')
    expect(result).not.toContain('-')
    expect(result).not.toContain(':')
    expect(result).not.toContain('Z')
    expect(result).toMatch(/^\d{8}T\d{6}$/)
  })
})

describe('formatIcsDateUtc', () => {
  it('formats a date in UTC with Z suffix', () => {
    const date = new Date('2026-02-22T09:00:00Z')
    expect(formatIcsDateUtc(date)).toBe('20260222T090000Z')
  })

  it('zero-pads single-digit month, day, hour, minute, second', () => {
    // 2026-01-05T03:04:05Z
    const date = new Date('2026-01-05T03:04:05Z')
    expect(formatIcsDateUtc(date)).toBe('20260105T030405Z')
  })

  it('returns a string without dashes or colons', () => {
    const date = new Date('2026-11-30T23:59:59Z')
    const result = formatIcsDateUtc(date)
    expect(result).not.toContain('-')
    expect(result).not.toContain(':')
    expect(result).toMatch(/^\d{8}T\d{6}Z$/)
  })

  it('ends with Z', () => {
    const date = new Date('2026-08-20T16:45:00Z')
    expect(formatIcsDateUtc(date)).toMatch(/Z$/)
  })
})
