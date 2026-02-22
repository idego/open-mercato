# SPEC-034 — Add to Calendar from Deal / Contact

**Date:** 2026-02-21
**Status:** Implemented
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
| 8 | `buildGoogleCalendarUrl` inlined in `useCalendarExport` rather than imported from shared | Worktree symlink constraint: `node_modules/@open-mercato/shared` resolves to main repo `dist/`, not worktree `src/`; inlining avoids TS2307 without build step |
| 9 | Relative imports between `calendar-export` and `customers` pages | Same symlink constraint — `@open-mercato/core/modules/...` cannot resolve new files in worktree; relative imports are stable |
| 10 | No `CalendarExportService` wrapper; direct DB access in route handler | The route does a single read-only query per request; a service layer would be premature abstraction for this use case |
| 11 | `useModuleEnabled` hook created in `calendar-export/frontend/hooks/` | Hook wasn't in codebase yet; placed in the module that uses it to avoid touching shared package |
| 12 | `ModulesContext` placed in `packages/shared/src/lib/frontend/` (not in `calendar-export`) | Importing from `@open-mercato/core` in `apps/mercato/backend/layout.tsx` caused a circular dependency; `@open-mercato/shared` already has wildcard exports, so the new file is auto-exported with no `package.json` changes |
| 13 | Pass `modules.map(m => ({ id: m.id }))` to `ModulesProvider` instead of full module objects | Full module objects contain a `loader` function which Next.js cannot serialize when crossing the Server→Client boundary, producing "Functions cannot be passed directly to Client Components" |
| 14 | All source edits must be made in main repo `src/` (not worktree `src/`) | Turbopack resolves packages via `node_modules` symlinks pointing to the main repo, not the worktree; changes to worktree `src/` files are invisible to Turbopack in dev mode |

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
| Download .ics | Browser download triggered → dialog closes after 1s |
| Close without exporting | No side effects |

---

## 7. Technical Design

### 7.1 Module structure (as implemented)

```
packages/shared/src/lib/calendar/
├── formatIcsDate.ts
├── generateIcs.ts
├── googleCalendarUrl.ts
└── __tests__/
    ├── formatIcsDate.test.ts
    └── generateIcs.test.ts

packages/core/src/modules/calendar-export/
├── index.ts
├── api/
│   └── ics/
│       └── route.ts              ← GET /api/calendar-export/ics
└── frontend/
    ├── components/
    │   └── AddToCalendarDialog/
    │       ├── AddToCalendarDialog.tsx
    │       └── index.ts
    └── hooks/
        ├── useCalendarExport.ts
        └── useModuleEnabled.ts
```

Registered in `apps/mercato/src/modules.ts`:

```ts
{ id: 'calendar-export', from: '@open-mercato/core' }
```

---

### 7.2 Shared utilities (zero external deps)

Location: `packages/shared/src/lib/calendar/`

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
DESCRIPTION:{description — \n escaped as \\n}
URL:{url}
END:VEVENT
END:VCALENDAR
```

Lines are terminated with `\r\n` (CRLF) per RFC 5545.

#### `formatIcsDate.ts`

```ts
/** Formats a Date in the given IANA timezone as YYYYMMDDTHHmmss (no Z suffix) */
function formatIcsDate(date: Date, timezone: string): string

/** Formats a Date in UTC as YYYYMMDDTHHmmssZ (for DTSTAMP) */
function formatIcsDateUtc(date: Date): string
```

`formatIcsDate` uses `Intl.DateTimeFormat.formatToParts` with explicit `timeZone` — no manual offset arithmetic, no DST risk.

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

Note: function is also inlined in `useCalendarExport.ts` due to worktree symlink constraint (see Decision #8).

---

### 7.3 Backend API

```
GET /api/calendar-export/ics
  ?entity=deal|person
  &id={entityId}          (UUID)
  &date={YYYY-MM-DD}
  &time={HH:mm}
  &duration={minutes}     (integer, 5–480)
  &timezone={IANA string} (max 100 chars)
```

- **Auth:** `getAuthFromRequest` — returns 401 if unauthenticated
- **Tenant scoping:** `findOneWithDecryption` with `{ id, tenantId, deletedAt: null }` — returns 404 if not found or cross-tenant
- **Response headers:**
  ```
  Content-Type: text/calendar; charset=utf-8
  Content-Disposition: attachment; filename="follow-up.ics"
  ```
- **Deal title:** `Follow-up: {deal.title}`, description includes stage and value
- **Person title:** `Follow-up: {person.displayName}`, description includes primary email

---

### 7.4 Frontend — `useCalendarExport` hook

State:

```ts
{
  date: Date           // default: tomorrow
  time: string         // default: "09:00"
  duration: number     // default: 30
  customDuration: number | null
  timezone: string     // read once from Intl on mount, not editable by user
}
```

Exposed:

```ts
{
  state, setDate, setTime, setDuration, setCustomDuration,
  buildPreview,        // pure — call directly in render, no useEffect
  handleDownloadIcs,   // uses apiCall<Blob> with parse: res => res.blob()
  handleOpenGoogle,    // window.open(url, '_blank')
  isDownloading,
}
```

Download uses `apiCall<Blob>` from `@open-mercato/ui/backend/utils/apiCall` with `parse: (res) => res.blob()`, then creates a temporary `<a download>` element to trigger browser save.

---

### 7.5 `AddToCalendarDialog` component

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

Key implementation notes:
- `buildPreview()` called directly in render — no `useEffect`/debounce
- Deeplink: `window.location.origin + /deals/{entityId}` or `/people/{entityId}`
- Download closes dialog after 1s (`setTimeout(onClose, 1000)`)
- `Escape` closes dialog via `onKeyDown` handler

---

### 7.6 Integration into Deal and Person pages

**DealDetail** (`customers/backend/customers/deals/[id]/page.tsx`):
- Button in `utilityActions` of `FormHeader`, conditional on `useModuleEnabled('calendar-export')`
- `entityMeta: { Stage: pipelineLabel ?? '', Value: valueLabel }`

**PersonDetail** (`customers/backend/customers/people/[id]/page.tsx`):
- Button passed via new `extraHeaderActions` prop on `PersonHighlights`
- `entityMeta: person.primaryEmail ? { Email: person.primaryEmail } : undefined`

**`PersonHighlights`** received a minimal new prop `extraHeaderActions?: React.ReactNode` rendered inside `utilityActions` before `VersionHistoryAction`.

---

### 7.7 Module feature flag

Both pages call `useModuleEnabled('calendar-export')`. The hook reads from a React Context (`ModulesContext`) populated by `ModulesProvider` in `apps/mercato/src/app/(backend)/backend/layout.tsx`. The server component passes `modules.map(m => ({ id: m.id }))` — stripping non-serializable fields — to the client context. The hook returns `false` when no context value is set (context default is an empty array).

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

Note: i18n key file (`en.json`) was not created — keys are used inline via `useT()` with fallback strings. A dedicated translations file can be added in a follow-up.

---

## 9. Acceptance Criteria

- [x] Module registered in `modules.ts`
- [x] Enabling the module shows "Add to Calendar" on Deal and Person detail pages
- [x] Disabling the module (removing from `modules.ts`) hides the button entirely
- [x] Dialog opens with tomorrow's date, 09:00, and 30 min pre-filled
- [x] Duration segmented control: 15 min / 30 min / 1h / 2h / Custom
- [x] Custom input accepts 5–480 min in steps of 5
- [x] Preview updates live on every field change
- [x] Preview shows: title, date+time range, timezone name, entity metadata, deep-link URL
- [x] "Open Google Calendar" opens new tab with all fields pre-filled; dialog stays open
- [x] "Download .ics" triggers browser download and closes dialog after 1s
- [x] `DTSTART` in `.ics` uses `TZID` matching the browser timezone
- [x] API returns 404 if entity not found or belongs to a different tenant
- [x] No new external npm packages introduced
- [x] All UI strings use i18n keys (with fallback strings)
- [ ] `.ics` imports correctly into Google Calendar, Apple Calendar, Outlook — pending manual E2E verification
- [ ] Toast shown after .ics download — not implemented (dialog closes, toast omitted)
- [x] Integration tests (Playwright) — TC-CRM-021, TC-CRM-022, TC-CRM-023

---

## 10. Files Created / Modified

| Action | Path |
|---|---|
| CREATE | `packages/shared/src/lib/calendar/formatIcsDate.ts` |
| CREATE | `packages/shared/src/lib/calendar/generateIcs.ts` |
| CREATE | `packages/shared/src/lib/calendar/googleCalendarUrl.ts` |
| CREATE | `packages/shared/src/lib/calendar/__tests__/formatIcsDate.test.ts` |
| CREATE | `packages/shared/src/lib/calendar/__tests__/generateIcs.test.ts` |
| CREATE | `packages/core/src/modules/calendar-export/index.ts` |
| CREATE | `packages/core/src/modules/calendar-export/api/ics/route.ts` |
| CREATE | `packages/core/src/modules/calendar-export/frontend/hooks/useCalendarExport.ts` |
| CREATE | `packages/core/src/modules/calendar-export/frontend/hooks/useModuleEnabled.ts` |
| CREATE | `packages/core/src/modules/calendar-export/frontend/components/AddToCalendarDialog/AddToCalendarDialog.tsx` |
| CREATE | `packages/core/src/modules/calendar-export/frontend/components/AddToCalendarDialog/index.ts` |
| MODIFY | `packages/core/src/modules/customers/components/detail/PersonHighlights.tsx` — added `extraHeaderActions` prop |
| MODIFY | `packages/core/src/modules/customers/backend/customers/deals/[id]/page.tsx` — button + dialog |
| MODIFY | `packages/core/src/modules/customers/backend/customers/people/[id]/page.tsx` — button + dialog |
| MODIFY | `apps/mercato/src/modules.ts` — registered `calendar-export` |
| CREATE | `packages/shared/src/lib/frontend/ModulesContext.tsx` — client-safe React Context (`ModulesProvider` + `useModules`) |
| MODIFY | `apps/mercato/src/app/(backend)/backend/layout.tsx` — wrapped backend layout in `<ModulesProvider modules={modules.map(m => ({ id: m.id }))}>`  |
| MODIFY | `packages/core/src/modules/calendar-export/frontend/hooks/useModuleEnabled.ts` — now imports `useModules` from `@open-mercato/shared/lib/frontend/ModulesContext` instead of `getModules()` |
| CREATE | `packages/core/src/modules/calendar-export/__integration__/TC-CRM-021.spec.ts` — UI test: Add to Calendar button on Deal page (admin) |
| CREATE | `packages/core/src/modules/calendar-export/__integration__/TC-CRM-022.spec.ts` — UI test: Add to Calendar button on Person page (employee) |
| CREATE | `packages/core/src/modules/calendar-export/__integration__/TC-CRM-023.spec.ts` — API test: ICS endpoint validation |

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
| 2026-02-21 | contributor | Updated after implementation: status → Implemented, corrected file paths (src/lib/calendar/, src/modules/calendar-export/api/ics/route.ts), documented worktree symlink decisions, updated acceptance criteria checklist, noted toast/i18n-file gaps |
| 2026-02-22 | contributor | Added `ModulesContext` in `packages/shared` (Decision #12–14): fixed button not visible on client — `useModuleEnabled` now reads from React Context populated by `ModulesProvider` in backend layout; added integration tests TC-CRM-021, TC-CRM-022, TC-CRM-023 |
