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
      { id, tenantId: auth.tenantId ?? undefined, deletedAt: null },
      {},
      decryptionScope,
    )
    if (!deal) return notFound()
    if (auth.tenantId && deal.tenantId !== auth.tenantId) return notFound()

    title = `Follow-up: ${deal.title}`
    const parts: string[] = [`Deal: ${deal.title}`]
    if (deal.pipelineStage) parts.push(`Stage: ${deal.pipelineStage}`)
    if (deal.valueAmount) parts.push(`Value: ${deal.valueAmount}${deal.valueCurrency ? ' ' + deal.valueCurrency : ''}`)
    description = parts.join('\n')
  } else {
    const person = await findOneWithDecryption(
      em,
      CustomerEntity,
      { id, kind: 'person', tenantId: auth.tenantId ?? undefined, deletedAt: null },
      {},
      decryptionScope,
    )
    if (!person) return notFound()
    if (auth.tenantId && person.tenantId !== auth.tenantId) return notFound()

    title = `Follow-up: ${person.displayName}`
    const parts: string[] = [`Person: ${person.displayName}`]
    if (person.primaryEmail) parts.push(`Email: ${person.primaryEmail}`)
    description = parts.join('\n')
  }

  const [hours, minutes] = time.split(':').map(Number)
  const start = new Date(`${date}T00:00:00`)
  start.setHours(hours, minutes, 0, 0)

  const ics = generateIcsContent({
    uid: `${entity}-${id}-${Date.now()}`,
    title,
    start,
    durationMinutes: duration,
    description,
    url: '',
    timezone,
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
  GET: {
    tags: ['Calendar Export'],
    summary: 'Generate ICS file for a deal or person follow-up',
    parameters: [
      { name: 'entity', in: 'query', required: true, schema: { type: 'string', enum: ['deal', 'person'] } },
      { name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'date', in: 'query', required: true, schema: { type: 'string', example: '2026-02-22' } },
      { name: 'time', in: 'query', required: true, schema: { type: 'string', example: '09:00' } },
      { name: 'duration', in: 'query', required: true, schema: { type: 'integer', minimum: 5, maximum: 480 } },
      { name: 'timezone', in: 'query', required: true, schema: { type: 'string', example: 'Europe/Warsaw' } },
    ],
    responses: {
      200: { description: 'ICS file' },
      400: { description: 'Invalid parameters' },
      401: { description: 'Authentication required' },
      404: { description: 'Entity not found' },
    },
  },
}
