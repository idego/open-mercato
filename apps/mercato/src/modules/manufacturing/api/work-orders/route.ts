import { z } from 'zod'
import { makeCrudRoute } from '@open-mercato/shared/lib/crud/factory'
import { WorkOrder } from '../../data/entities'
import { workOrderListSchema, workOrderCreateSchema, workOrderUpdateSchema } from '../../data/validators'
import { workOrderCrudEvents, workOrderCrudIndexer } from '../../commands/work-orders'
import { E } from '@/.mercato/generated/entities.ids.generated'
import type { Where, WhereValue } from '@open-mercato/shared/lib/query/types'
import type { WorkOrderListItem } from '../../types'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import {
  createManufacturingCrudOpenApi,
  createManufacturingPagedListResponseSchema,
  manufacturingCreatedSchema,
  manufacturingOkSchema,
  workOrderListItemSchema,
} from '../openapi'

const rawBodySchema = z.object({}).passthrough()

type Query = z.infer<typeof workOrderListSchema>

type BaseFields = {
  id: string
  wo_number: string
  status: string
  customer_name: string | null
  industry: string | null
  priority: string
  material: string | null
  quantity: number | null
  due_date: string | null
  materials_available: boolean
  tenant_id: string | null
  organization_id: string | null
  created_at: Date
}

export const { metadata, GET, POST, PUT, DELETE } = makeCrudRoute({
  metadata: {
    GET: { requireAuth: true, requireFeatures: ['manufacturing.work_orders.view'] },
    POST: { requireAuth: true, requireFeatures: ['manufacturing.work_orders.manage'] },
    PUT: { requireAuth: true, requireFeatures: ['manufacturing.work_orders.manage'] },
    DELETE: { requireAuth: true, requireFeatures: ['manufacturing.work_orders.manage'] },
  },
  orm: {
    entity: WorkOrder,
    idField: 'id',
    orgField: 'organizationId',
    tenantField: 'tenantId',
    softDeleteField: 'deletedAt',
  },
  events: workOrderCrudEvents,
  indexer: workOrderCrudIndexer,
  list: {
    schema: workOrderListSchema,
    entityId: E.manufacturing.work_order,
    fields: ['id', 'wo_number', 'status', 'customer_name', 'industry', 'priority', 'material', 'quantity', 'due_date', 'materials_available', 'tenant_id', 'organization_id', 'created_at'],
    sortFieldMap: {
      id: 'id',
      wo_number: 'wo_number',
      status: 'status',
      priority: 'priority',
      created_at: 'created_at',
      due_date: 'due_date',
    },
    buildFilters: async (q: Query): Promise<Where<BaseFields>> => {
      const filters: Where<BaseFields> = {}
      const F = filters as Record<string, WhereValue>
      if (q.id) F.id = q.id
      if (q.status) F.status = q.status
      if (q.priority) F.priority = q.priority
      if (q.industry) F.industry = q.industry
      if (q.customer_name) F.customer_name = { $ilike: `%${q.customer_name}%` }
      if (q.wo_number) F.wo_number = { $ilike: `%${q.wo_number}%` }
      return filters
    },
    transformItem: (item: BaseFields): WorkOrderListItem => ({
      id: String(item.id),
      wo_number: String(item.wo_number),
      status: String(item.status),
      customer_name: item.customer_name ?? null,
      industry: item.industry ?? null,
      priority: String(item.priority),
      material: item.material ?? null,
      quantity: item.quantity ?? null,
      due_date: item.due_date ?? null,
      materials_available: !!item.materials_available,
      tenant_id: item.tenant_id ?? null,
      organization_id: item.organization_id ?? null,
    }),
  },
  actions: {
    create: {
      commandId: 'manufacturing.work_orders.create',
      schema: rawBodySchema,
      mapInput: ({ parsed }) => parsed,
      response: ({ result }) => ({ id: String(result.id) }),
      status: 201,
    },
    update: {
      commandId: 'manufacturing.work_orders.update',
      schema: rawBodySchema,
      mapInput: ({ parsed }) => parsed,
      response: () => ({ ok: true }),
    },
    delete: {
      commandId: 'manufacturing.work_orders.delete',
      response: () => ({ ok: true }),
    },
  },
})

export const openApi: OpenApiRouteDoc = createManufacturingCrudOpenApi({
  resourceName: 'WorkOrder',
  pluralName: 'WorkOrders',
  querySchema: workOrderListSchema,
  listResponseSchema: createManufacturingPagedListResponseSchema(workOrderListItemSchema),
  create: {
    schema: workOrderCreateSchema,
    description: 'Creates a new work order.',
    responseSchema: manufacturingCreatedSchema,
  },
  update: {
    schema: workOrderUpdateSchema,
    description: 'Updates an existing work order by id.',
    responseSchema: manufacturingOkSchema,
  },
  del: {
    schema: z.object({ id: z.string().uuid() }),
    description: 'Deletes a work order by id.',
    responseSchema: manufacturingOkSchema,
  },
})
