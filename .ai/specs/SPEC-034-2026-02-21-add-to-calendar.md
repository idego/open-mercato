# SPEC-014 — Add to Calendar from Deal / Contact

**Date:** 2026-02-21  
**Status:** Ready for Implementation  
**Author:** contributor  

---

## 1. Summary

Add an "Add to Calendar" action to Deal and People detail views. The user picks a date, time, and duration in a full dialog with a live event preview, then exports to Google Calendar (deep-link) or downloads a `.ics` file (RFC 5545, explicit TZID). Implemented as a standalone optional module `calendar-export`.

---

## 2. Motivation

Sales and account management workflows revolve around follow-ups. Users currently have no way to create a calendar reminder directly from a deal or contact — they must switch to their calendar app and recreate context manually. This feature closes that gap with zero OAuth, zero external APIs, and no new npm dependencies.

---

## 3. Decisions Log

| # | Decision | Rationale |
|---|---|---|
| 1 | Standalone optional module `calendar-export` | Single responsibility, no pollution of `deals`/`people` modules, opt-in per installation |
| 2 | `.ics` uses explicit `TZID` (`DTSTART;TZID=Europe/Warsaw:20260222T090000`) | More correct than UTC-only — calendar apps display the event in the right local time without ambiguity |
| 3 | Full dialog with event preview + confirm button | User sees exactly what will be exported before committing |
| 4 | Duration options: 15 min, 30 min (default), 1h, 2h, Custom | Covers typical meeting lengths; custom handles edge cases |
| 5 | Timezone sourced from browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`) | No user setup required; correct for the device they're working on |
| 6 | No `VTIMEZONE` block in `.ics` output | All target clients (Google Cal, Outlook 2016+, Apple Cal macOS 10.12+) resolve IANA timezone names in `TZID` directly; adding `VTIMEZONE` would add complexity with no practical benefit for supported clients |
| 7 | Date formatting via native `Date` + `Intl.DateTimeFormat` with `timeZone` option — no external library | Zero dependencies; fully sufficient for RFC 5545 timestamp formatting; requires explicit zero-padding (e.g. `String(n).padStart(2, '0')`) which is handled in a shared `formatIcsDate` helper |

---

## 4. Scope

**In scope:**
- Optional module `calendar-export` with its own frontend component and backend API
- "Add to Calendar" button on Deal detail page
- "Add to Calendar" button on Person detail page
- Full dialog: date picker + time picker + duration selector + live event preview
- Two export targets: Google Calendar deep-link and `.ics` file download

**Out of scope:**
- Two-way sync / OAuth calendar integration
- Recurring events
- Attendees / invites
- Calendar view inside Open Mercato UI

---

## 5. User Stories

> As a sales rep viewing a deal, I want to open a calendar dialog, pick a date and duration, see a preview of the event, then export it to Google Calendar — so I can schedule a follow-up in seconds without leaving the app.

> As an account manager using Outlook, I want to download an .ics from a contact's page that opens correctly in my timezone, so the reminder appears at the right time.

---

## 6. UX Design

### 6.1 Trigger

Single action button in the header of Deal detail and Person detail pages:

```
[ 📅 Add to Calendar ]
```

Clicking opens the dialog. No dropdown.

---

### 6.2 Dialog — Layout

```
┌─────────────────────────────────────────────┐
│  Schedule Follow-up                      [×] │
├─────────────────────────────────────────────┤
│  Date        [ 22 Feb 2026        ▾ ]        │
│  Time        [ 09:00             ▾ ]         │
│  Duration    [ 30 min            ▾ ]         │
│              ○ 15 min  ● 30 min  ○ 1h        │
│              ○ 2h      ○ Custom: [___] min   │
├─────────────────────────────────────────────┤
│  Preview                                     │
│  ┌─────────────────────────────────────────┐ │
│  │ Follow-up: Deal Name                    │ │
│  │ Mon, 22 Feb 2026 · 09:00 – 09:30        │ │
│  │ Europe/Warsaw                           │ │
│  │                                         │ │
│  │ Deal: Deal Name                         │ │
│  │ Stage: Negotiation  Value: €12,000      │ │
│  │ https://app.../deals/abc123             │ │
│  └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│  [ Download .ics ]    [ Open Google Cal → ] │
└─────────────────────────────────────────────┘
```

Preview updates **live** on every field change — no extra confirm step before clicking an export button.

---

### 6.3 Duration selector behaviour

Displayed as a segmented control: `15 min | 30 min | 1h | 2h | Custom`

- Default: **30 min**
- Custom: reveals a numeric input (minutes, min 5, max 480, step 5)
- Preview updates immediately on change

---

### 6.4 Post-export behaviour

| Action | Result |
|---|---|
| Open Google Calendar | `window.open(url, '_blank')` — dialog stays open |
| Download .ics | Browser download triggered → dialog closes after 1s → toast: *"Follow-up saved to your calendar"* |
| Close without exporting | No side effects |

---

## 7. Technical Design

### 7.1 Module structure

```
packages/core/modules/calendar-export/
├── index.ts
├── backend/
│   ├── api/
│   │   └── routes.ts                 ← GET /api/calendar-export/ics
│   └── services/
│       └── CalendarExportService.ts
└── frontend/
    ├── components/
    │   └── AddToCalendarDialog/
    │       ├── AddToCalendarDialog.tsx
    │       └── index.ts
    └── hooks/
        └── useCalendarExport.ts
```

Registered in `apps/mercato/src/modules.ts` as optional:

```ts
{ id: 'calendar-export', from: '@open-mercato/core', enabled: false }
```

---

### 7.2 Shared utilities (zero external deps)

Location: `packages/shared/lib/calendar/`

#### `generateIcs.ts`

```ts
interface IcsParams {
  uid: string
  title: string
  start: Date
  durationMinutes: number
  description: string
  url: string
  timezone: string   // e.g. "Europe/Warsaw"
}

function generateIcsContent(params: IcsParams): string
```

Output format (RFC 5545, explicit TZID, no `VTIMEZONE` block):

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Open Mercato//calendar-export//EN
BEGIN:VEVENT
UID:{uid}@openmercato
DTSTAMP:{utcNow as YYYYMMDDTHHmmssZ}
DTSTART;TZID={timezone}:{start as YYYYMMDDTHHmmss}
DTEND;TZID={timezone}:{end as YYYYMMDDTHHmmss}
SUMMARY:{title}
DESCRIPTION:{description — \n escaped}
URL:{url}
END:VEVENT
END:VCALENDAR
```

Date formatting uses a shared internal helper — no external library:

```ts
// packages/shared/lib/calendar/formatIcsDate.ts

/** Formats a Date in the given IANA timezone as YYYYMMDDTHHmmss (no Z suffix) */
function formatIcsDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '00'

  return `${get('year')}${get('month')}${get('day')}T${get('hour')}${get('minute')}${get('second')}`
}

/** Formats a Date in UTC as YYYYMMDDTHHmmssZ (for DTSTAMP) */
function formatIcsDateUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}
```

`formatIcsDate` relies on `Intl.DateTimeFormat.formatToParts` with explicit `timeZone` — no manual offset arithmetic, no risk of DST errors. `hour12: false` gives 24h values; `'2-digit'` handles zero-padding natively for month/day/hour/minute/second (year is always 4 digits from `Intl`).

#### `googleCalendarUrl.ts`

```ts
interface GoogleCalParams {
  title: string
  start: Date
  durationMinutes: number
  description: string
  timezone: string
}

function buildGoogleCalendarUrl(params: GoogleCalParams): string
// https://calendar.google.com/calendar/render?action=TEMPLATE
//   &text={title}
//   &dates={startUtc}/{endUtc}
//   &ctz={timezone}
//   &details={description}
```

---

### 7.3 Backend API

```
GET /api/calendar-export/ics
  ?entity=deal|person
  &id={entityId}
  &date={YYYY-MM-DD}
  &time={HH:mm}
  &duration={minutes}
  &timezone={IANA timezone string}
```

- **Auth:** standard JWT middleware
- **Tenant scoping:** `CalendarExportService` fetches the entity via its own service (`DealsService.findOne({ id, tenantId })`) — returns 404 if not found or not owned
- **Response headers:**
  ```
  Content-Type: text/calendar; charset=utf-8
  Content-Disposition: attachment; filename="follow-up.ics"
  ```

---

### 7.4 Frontend — `AddToCalendarDialog`

Props:

```ts
interface AddToCalendarDialogProps {
  open: boolean
  onClose: () => void
  entity: 'deal' | 'person'
  entityId: string
  entityName: string
  entityMeta?: Record<string, string>  // stage, value, email, etc.
}
```

Internal state:

```ts
{
  date: Date           // default: tomorrow
  time: string         // default: "09:00"
  duration: number     // default: 30
  customDuration: number | null
  timezone: string     // read once from Intl on mount, not editable by user
}
```

`useCalendarExport` hook encapsulates:
- building preview strings (pure, reactive)
- calling `buildGoogleCalendarUrl` (pure, no API call)
- calling `GET /api/calendar-export/ics` and triggering browser download via `<a download>`

---

### 7.5 Module feature flag in Deal/Person pages

Both pages check `useModuleEnabled('calendar-export')` before rendering the button — no dead UI when module is disabled.

---

## 8. i18n Keys

```json
{
  "calendar_export.button": "Add to Calendar",
  "calendar_export.dialog_title": "Schedule Follow-up",
  "calendar_export.field_date": "Date",
  "calendar_export.field_time": "Time",
  "calendar_export.field_duration": "Duration",
  "calendar_export.duration_15": "15 min",
  "calendar_export.duration_30": "30 min",
  "calendar_export.duration_60": "1h",
  "calendar_export.duration_120": "2h",
  "calendar_export.duration_custom": "Custom",
  "calendar_export.preview_title": "Preview",
  "calendar_export.action_ics": "Download .ics",
  "calendar_export.action_google": "Open Google Calendar",
  "calendar_export.toast_success": "Follow-up saved to your calendar"
}
```

---

## 9. Acceptance Criteria

- [ ] Module registered in `modules.ts` as `enabled: false` by default
- [ ] Enabling the module shows "Add to Calendar" on Deal and Person detail pages
- [ ] Disabling the module hides the button entirely
- [ ] Dialog opens with tomorrow's date, 09:00, and 30 min pre-filled
- [ ] Duration segmented control: 15 min / 30 min / 1h / 2h / Custom
- [ ] Custom input accepts 5–480 min in steps of 5
- [ ] Preview updates live on every field change
- [ ] Preview shows: title, date+time range, timezone name, entity metadata, deep-link URL
- [ ] "Open Google Calendar" opens new tab with all fields pre-filled; dialog stays open
- [ ] "Download .ics" triggers browser download and closes dialog after 1s with toast
- [ ] `.ics` imports correctly into Google Calendar, Apple Calendar, Outlook with correct local time
- [ ] `DTSTART` in `.ics` uses `TZID` matching the browser timezone
- [ ] API returns 404 if entity not found or belongs to a different tenant
- [ ] No new external npm packages introduced
- [ ] All UI strings use i18n keys

---

## 10. Files to Create / Modify

| Action | Path |
|---|---|
| CREATE | `packages/shared/lib/calendar/generateIcs.ts` |
| CREATE | `packages/shared/lib/calendar/formatIcsDate.ts` |
| CREATE | `packages/shared/lib/calendar/googleCalendarUrl.ts` |
| CREATE | `packages/shared/lib/calendar/index.ts` |
| MODIFY | `packages/shared/lib/index.ts` — export calendar utils |
| CREATE | `packages/core/modules/calendar-export/index.ts` |
| CREATE | `packages/core/modules/calendar-export/backend/api/routes.ts` |
| CREATE | `packages/core/modules/calendar-export/backend/services/CalendarExportService.ts` |
| CREATE | `packages/core/modules/calendar-export/frontend/components/AddToCalendarDialog/AddToCalendarDialog.tsx` |
| CREATE | `packages/core/modules/calendar-export/frontend/components/AddToCalendarDialog/index.ts` |
| CREATE | `packages/core/modules/calendar-export/frontend/hooks/useCalendarExport.ts` |
| CREATE | `packages/core/modules/calendar-export/i18n/en.json` |
| MODIFY | `apps/mercato/src/modules.ts` — register as `enabled: false` |
| MODIFY | `packages/core/modules/deals/frontend/pages/DealDetail.tsx` |
| MODIFY | `packages/core/modules/people/frontend/pages/PersonDetail.tsx` |

---

## 11. Open Questions

*None — all design decisions resolved.*

---

## 12. Changelog

| Date | Author | Change |
|---|---|---|
| 2026-02-21 | contributor | Initial draft |
| 2026-02-21 | contributor | Finalized: optional module, TZID format, full dialog with live preview, duration options (15/30/1h/2h/custom) |
| 2026-02-21 | contributor | Locked: no VTIMEZONE block; date formatting via native `Intl.DateTimeFormat` + `formatIcsDate` helper, zero external deps |
