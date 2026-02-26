import { z } from 'zod'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import type { EntityManager } from '@mikro-orm/postgresql'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { CustomerDeal, CustomerEntity } from '@open-mercato/core/modules/customers/data/entities'
import { generateIcsContent } from '@open-mercato/shared/lib/calendar/generateIcs'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'

const querySchema = z.object({
  entity: z.enum(['deal', 'person']),
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.coerce.number().int().min(5).max(480),
  timezone: z.string().min(1).max(100),
})

export const metadata = {
  auth: { requireAuth: true },
}

function notFound() {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Authentication required' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Adds days to a YYYY-MM-DD string using UTC arithmetic to avoid server-timezone drift. */
function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Computes ICS DTSTART/DTEND strings directly from user-provided local date, time, and duration.
 * Avoids constructing a Date in server-local timezone which would produce wrong DTSTART
 * when the server timezone differs from the user's timezone.
 */
function buildLocalIcsTimes(
  date: string,
  time: string,
  durationMinutes: number,
): { dtstart: string; dtend: string } {
  const dtstart = `${date.replace(/-/g, '')}T${time.replace(':', '')}00`

  const [startH, startM] = time.split(':').map(Number)
  const endTotalMinutes = startH * 60 + startM + durationMinutes
  const endH = Math.floor(endTotalMinutes / 60) % 24
  const endM = endTotalMinutes % 60
  const dayOverflow = Math.floor(endTotalMinutes / (24 * 60))
  const endDate = dayOverflow > 0 ? addDaysToDateStr(date, dayOverflow) : date
  const dtend =
    `${endDate.replace(/-/g, '')}T` +
    `${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`

  return { dtstart, dtend }
}

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.sub && !auth?.isApiKey) {
    return unauthorized()
  }

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    entity: url.searchParams.get('entity'),
    id: url.searchParams.get('id'),
    date: url.searchParams.get('date'),
    time: url.searchParams.get('time'),
    duration: url.searchParams.get('duration'),
    timezone: url.searchParams.get('timezone'),
  })
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { entity, id, date, time, duration, timezone } = parsed.data
  const container = await createRequestContainer()
  const em = container.resolve('em') as EntityManager

  const decryptionScope = {
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId ?? null,
  }

  let title: string
  let description: string

  if (entity === 'deal') {
    const deal = await findOneWithDecryption(
      em,
      CustomerDeal,
      {
        id,
        tenantId: auth.tenantId ?? undefined,
        organizationId: auth.orgId ?? undefined,
        deletedAt: null,
      },
      {},
      decryptionScope,
    )
    if (!deal) return notFound()

    title = `Follow-up: ${deal.title}`
    const parts: string[] = [`Deal: ${deal.title}`]
    if (deal.pipelineStage) parts.push(`Stage: ${deal.pipelineStage}`)
    if (deal.valueAmount) parts.push(`Value: ${deal.valueAmount}${deal.valueCurrency ? ' ' + deal.valueCurrency : ''}`)
    description = parts.join('\n')
  } else {
    const person = await findOneWithDecryption(
      em,
      CustomerEntity,
      {
        id,
        kind: 'person',
        tenantId: auth.tenantId ?? undefined,
        organizationId: auth.orgId ?? undefined,
        deletedAt: null,
      },
      {},
      decryptionScope,
    )
    if (!person) return notFound()

    title = `Follow-up: ${person.displayName}`
    const parts: string[] = [`Person: ${person.displayName}`]
    if (person.primaryEmail) parts.push(`Email: ${person.primaryEmail}`)
    description = parts.join('\n')
  }

  const { dtstart, dtend } = buildLocalIcsTimes(date, time, duration)

  const ics = generateIcsContent({
    uid: `${entity}-${id}-${Date.now()}`,
    title,
    start: new Date(),
    durationMinutes: duration,
    description,
    url: '',
    timezone,
    dtstart,
    dtend,
  })

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="follow-up.ics"',
    },
  })
}

export const openApi: OpenApiRouteDoc = {
  tag: 'Calendar Export',
  summary: 'Generate ICS file for a deal or person follow-up',
  methods: {
    GET: {
      summary: 'Download follow-up .ics file',
      query: querySchema,
      responses: [
        { status: 200, description: 'ICS calendar file' },
        { status: 400, description: 'Invalid parameters' },
        { status: 401, description: 'Authentication required' },
        { status: 404, description: 'Entity not found' },
      ],
    },
  },
}
