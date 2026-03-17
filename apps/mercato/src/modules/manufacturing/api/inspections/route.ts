import { z } from 'zod'
import { makeCrudRoute } from '@open-mercato/shared/lib/crud/factory'
import { InspectionRecord } from '../../data/entities'
import { inspectionListSchema, inspectionCreateSchema, inspectionUpdateSchema } from '../../data/validators'
import { inspectionCrudEvents, inspectionCrudIndexer } from '../../commands/inspections'
import { E } from '@/.mercato/generated/entities.ids.generated'
import type { Where, WhereValue } from '@open-mercato/shared/lib/query/types'
import type { InspectionListItem } from '../../types'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import {
  createManufacturingCrudOpenApi,
  createManufacturingPagedListResponseSchema,
  manufacturingCreatedSchema,
  manufacturingOkSchema,
  inspectionListItemSchema,
} from '../openapi'

const rawBodySchema = z.object({}).passthrough()

type Query = z.infer<typeof inspectionListSchema>

type BaseFields = {
  id: string
  inspection_number: string
  work_order_ref: string | null
  inspector_name: string | null
  result: string | null
  defect_description: string | null
  inspection_date: string | null
  tenant_id: string | null
  organization_id: string | null
  created_at: Date
}

export const { metadata, GET, POST, PUT, DELETE } = makeCrudRoute({
  metadata: {
    GET: { requireAuth: true, requireFeatures: ['manufacturing.inspections.view'] },
    POST: { requireAuth: true, requireFeatures: ['manufacturing.inspections.manage'] },
    PUT: { requireAuth: true, requireFeatures: ['manufacturing.inspections.manage'] },
    DELETE: { requireAuth: true, requireFeatures: ['manufacturing.inspections.manage'] },
  },
  orm: {
    entity: InspectionRecord,
    idField: 'id',
    orgField: 'organizationId',
    tenantField: 'tenantId',
    softDeleteField: 'deletedAt',
  },
  events: inspectionCrudEvents,
  indexer: inspectionCrudIndexer,
  list: {
    schema: inspectionListSchema,
    entityId: E.manufacturing.inspection_record,
    fields: ['id', 'inspection_number', 'work_order_ref', 'inspector_name', 'result', 'defect_description', 'inspection_date', 'tenant_id', 'organization_id', 'created_at'],
    sortFieldMap: {
      id: 'id',
      inspection_number: 'inspection_number',
      result: 'result',
      created_at: 'created_at',
      inspection_date: 'inspection_date',
    },
    buildFilters: async (q: Query): Promise<Where<BaseFields>> => {
      const filters: Where<BaseFields> = {}
      const F = filters as Record<string, WhereValue>
      if (q.id) F.id = q.id
      if (q.result) F.result = q.result
      if (q.work_order_ref) F.work_order_ref = { $ilike: `%${q.work_order_ref}%` }
      if (q.inspector_name) F.inspector_name = { $ilike: `%${q.inspector_name}%` }
      return filters
    },
    transformItem: (item: BaseFields): InspectionListItem => ({
      id: String(item.id),
      inspection_number: String(item.inspection_number),
      work_order_ref: item.work_order_ref ?? null,
      inspector_name: item.inspector_name ?? null,
      result: item.result ?? null,
      defect_description: item.defect_description ?? null,
      inspection_date: item.inspection_date ?? null,
      tenant_id: item.tenant_id ?? null,
      organization_id: item.organization_id ?? null,
    }),
  },
  actions: {
    create: {
      commandId: 'manufacturing.inspections.create',
      schema: rawBodySchema,
      mapInput: ({ parsed }) => parsed,
      response: ({ result }) => ({ id: String(result.id) }),
      status: 201,
    },
    update: {
      commandId: 'manufacturing.inspections.update',
      schema: rawBodySchema,
      mapInput: ({ parsed }) => parsed,
      response: () => ({ ok: true }),
    },
    delete: {
      commandId: 'manufacturing.inspections.delete',
      response: () => ({ ok: true }),
    },
  },
})

export const openApi: OpenApiRouteDoc = createManufacturingCrudOpenApi({
  resourceName: 'InspectionRecord',
  pluralName: 'InspectionRecords',
  querySchema: inspectionListSchema,
  listResponseSchema: createManufacturingPagedListResponseSchema(inspectionListItemSchema),
  create: {
    schema: inspectionCreateSchema,
    description: 'Creates a new inspection record.',
    responseSchema: manufacturingCreatedSchema,
  },
  update: {
    schema: inspectionUpdateSchema,
    description: 'Updates an existing inspection record by id.',
    responseSchema: manufacturingOkSchema,
  },
  del: {
    schema: z.object({ id: z.string().uuid() }),
    description: 'Deletes an inspection record by id.',
    responseSchema: manufacturingOkSchema,
  },
})
