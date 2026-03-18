import { z, type ZodTypeAny } from 'zod'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import {
  createCrudOpenApiFactory,
  createPagedListResponseSchema as createSharedPagedListResponseSchema,
  type CrudOpenApiOptions,
} from '@open-mercato/shared/lib/openapi/crud'

export const manufacturingTag = 'Manufacturing'

export const manufacturingOkSchema = z.object({ ok: z.literal(true) })
export const manufacturingCreatedSchema = z.object({ id: z.string().uuid() })

export const workOrderListItemSchema = z.object({
  id: z.string(),
  wo_number: z.string(),
  status: z.string(),
  customer_entity_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  priority: z.string(),
  material: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  due_date: z.string().nullable().optional(),
  materials_available: z.boolean().optional(),
}).passthrough()

export const inspectionListItemSchema = z.object({
  id: z.string(),
  inspection_number: z.string(),
  work_order_ref: z.string().nullable().optional(),
  inspector_name: z.string().nullable().optional(),
  result: z.string().nullable().optional(),
  defect_description: z.string().nullable().optional(),
  inspection_date: z.string().nullable().optional(),
}).passthrough()

export function createManufacturingPagedListResponseSchema(itemSchema: ZodTypeAny) {
  return createSharedPagedListResponseSchema(itemSchema, { paginationMetaOptional: true })
}

const buildManufacturingCrudOpenApi = createCrudOpenApiFactory({
  defaultTag: manufacturingTag,
  defaultCreateResponseSchema: manufacturingCreatedSchema,
  defaultOkResponseSchema: manufacturingOkSchema,
  makeListDescription: ({ pluralLower }) =>
    `Returns a paginated collection of ${pluralLower} in the current tenant scope.`,
})

export function createManufacturingCrudOpenApi(options: CrudOpenApiOptions): OpenApiRouteDoc {
  return buildManufacturingCrudOpenApi(options)
}
