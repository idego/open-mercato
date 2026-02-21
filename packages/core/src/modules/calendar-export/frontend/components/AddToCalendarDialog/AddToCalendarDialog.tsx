'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-mercato/ui/primitives/dialog'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { useCalendarExport, type CalendarEntity } from '../../hooks/useCalendarExport'

export interface AddToCalendarDialogProps {
  open: boolean
  onClose: () => void
  entity: CalendarEntity
  entityId: string
  entityName: string
  entityMeta?: Record<string, string>
}

const DURATION_PRESETS = [
  { value: 15, labelKey: 'calendar_export.duration_15', fallback: '15 min' },
  { value: 30, labelKey: 'calendar_export.duration_30', fallback: '30 min' },
  { value: 60, labelKey: 'calendar_export.duration_60', fallback: '1h' },
  { value: 120, labelKey: 'calendar_export.duration_120', fallback: '2h' },
] as const

function buildDeeplink(entity: CalendarEntity, entityId: string): string {
  const base =
    typeof window !== 'undefined' ? window.location.origin : ''
  const segment = entity === 'deal' ? 'deals' : 'people'
  return `${base}/${segment}/${entityId}`
}

export function AddToCalendarDialog({
  open,
  onClose,
  entity,
  entityId,
  entityName,
  entityMeta,
}: AddToCalendarDialogProps) {
  const t = useT()
  const {
    state,
    setDate,
    setTime,
    setDuration,
    setCustomDuration,
    buildPreview,
    handleDownloadIcs,
    handleOpenGoogle,
    isDownloading,
  } = useCalendarExport({ entity, entityId, entityName, entityMeta })

  const { date, time, duration, customDuration, timezone } = state
  const isCustom = customDuration !== null
  const deeplink = buildDeeplink(entity, entityId)

  // buildPreview() is pure — called directly in render, no useEffect needed
  const previewText = buildPreview()
  const previewLines = previewText.split('\n')

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = new Date(e.target.value)
    if (!Number.isNaN(parsed.getTime())) setDate(parsed)
  }

  const handleDurationPreset = (value: number) => {
    setDuration(value)
    setCustomDuration(null)
  }

  const handleCustomDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (val >= 5 && val <= 480) setCustomDuration(val)
  }

  const handleDownload = async () => {
    await handleDownloadIcs()
    setTimeout(onClose, 1000)
  }

  const dateInputValue = date.toISOString().slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        className="sm:max-w-lg"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {t('calendar_export.dialog_title', 'Schedule Follow-up')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Date */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="cal-date">
              {t('calendar_export.field_date', 'Date')}
            </Label>
            <Input
              id="cal-date"
              type="date"
              value={dateInputValue}
              onChange={handleDateChange}
              className="col-span-2"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="cal-time">
              {t('calendar_export.field_time', 'Time')}
            </Label>
            <Input
              id="cal-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="col-span-2"
            />
          </div>

          {/* Duration segmented control */}
          <div className="grid grid-cols-3 items-start gap-4">
            <Label className="pt-2">
              {t('calendar_export.field_duration', 'Duration')}
            </Label>
            <div className="col-span-2 flex flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleDurationPreset(preset.value)}
                  className={[
                    'rounded border px-3 py-1 text-sm transition-colors',
                    !isCustom && duration === preset.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-accent',
                  ].join(' ')}
                >
                  {t(preset.labelKey, preset.fallback)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomDuration(customDuration ?? 45)}
                className={[
                  'rounded border px-3 py-1 text-sm transition-colors',
                  isCustom
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-accent',
                ].join(' ')}
              >
                {t('calendar_export.duration_custom', 'Custom')}
              </button>
              {isCustom && (
                <Input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={customDuration ?? 45}
                  onChange={handleCustomDurationChange}
                  className="w-24"
                  aria-label="Custom duration in minutes"
                />
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('calendar_export.preview_title', 'Preview')}
            </p>
            <div className="space-y-0.5 text-sm">
              {previewLines.map((line, i) => (
                <p key={i} className={i === 0 ? 'font-medium' : 'text-muted-foreground'}>
                  {line || '\u00A0'}
                </p>
              ))}
              <p className="break-all text-xs text-muted-foreground">{deeplink}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {t('calendar_export.action_ics', 'Download .ics')}
          </Button>
          <Button onClick={handleOpenGoogle}>
            {t('calendar_export.action_google', 'Open Google Calendar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
