'use client'

import { useState, useCallback } from 'react'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'

export type CalendarEntity = 'deal' | 'person'

interface UseCalendarExportParams {
  entity: CalendarEntity
  entityId: string
  entityName: string
  entityMeta?: Record<string, string>
}

function buildGoogleCalendarUrl(params: {
  title: string
  start: Date
  durationMinutes: number
  description: string
  timezone: string
}): string {
  const { title, start, durationMinutes, description, timezone } = params
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const compact = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${compact(start)}/${compact(end)}`,
    ctz: timezone,
    details: description,
  })
  return `https://calendar.google.com/calendar/render?${query.toString()}`
}

function getTomorrow(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function buildStartDate(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}

function formatPreviewRange(start: Date, durationMinutes: number, timezone: string): string {
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${fmt.format(start)} – ${timeFmt.format(end)}`
}

export interface CalendarExportState {
  date: Date
  time: string
  duration: number
  customDuration: number | null
  timezone: string
}

export interface UseCalendarExportResult {
  state: CalendarExportState
  setDate: (date: Date) => void
  setTime: (time: string) => void
  setDuration: (minutes: number) => void
  setCustomDuration: (minutes: number | null) => void
  buildPreview: () => string
  handleDownloadIcs: () => Promise<void>
  handleOpenGoogle: () => void
  isDownloading: boolean
}

export function useCalendarExport({
  entity,
  entityId,
  entityName,
  entityMeta,
}: UseCalendarExportParams): UseCalendarExportResult {
  const [date, setDate] = useState<Date>(getTomorrow)
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState(30)
  const [customDuration, setCustomDuration] = useState<number | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const effectiveDuration = customDuration ?? duration

  const buildPreview = useCallback((): string => {
    const start = buildStartDate(date, time)
    const range = formatPreviewRange(start, effectiveDuration, timezone)
    const metaLines = entityMeta
      ? Object.entries(entityMeta)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      : ''
    const parts = [
      `Follow-up: ${entityName}`,
      range,
      timezone,
      metaLines,
    ].filter(Boolean)
    return parts.join('\n')
  }, [date, time, effectiveDuration, timezone, entityName, entityMeta])

  const handleDownloadIcs = useCallback(async () => {
    setIsDownloading(true)
    try {
      const params = new URLSearchParams({
        entity,
        id: entityId,
        date: date.toISOString().slice(0, 10),
        time,
        duration: String(effectiveDuration),
        timezone,
      })
      const result = await apiCall<Blob>(
        `/api/calendar-export/ics?${params.toString()}`,
        undefined,
        { parse: (res) => res.blob() },
      )
      if (!result.ok || !result.result) return
      const url = URL.createObjectURL(result.result)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'follow-up.ics'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }, [entity, entityId, date, time, effectiveDuration, timezone])

  const handleOpenGoogle = useCallback(() => {
    const start = buildStartDate(date, time)
    const description = buildPreview()
    const url = buildGoogleCalendarUrl({
      title: `Follow-up: ${entityName}`,
      start,
      durationMinutes: effectiveDuration,
      description,
      timezone,
    })
    window.open(url, '_blank')
  }, [date, time, effectiveDuration, timezone, entityName, buildPreview])

  return {
    state: { date, time, duration, customDuration, timezone },
    setDate,
    setTime,
    setDuration,
    setCustomDuration,
    buildPreview,
    handleDownloadIcs,
    handleOpenGoogle,
    isDownloading,
  }
}
