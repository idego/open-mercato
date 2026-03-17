import { z } from 'zod'

export const workOrderCreateSchema = z.object({
  wo_number: z.string().min(1).max(50),
  status: z.enum(['DRAFT', 'PLANNED', 'RELEASED', 'IN_PROGRESS', 'QC', 'COMPLETED', 'CLOSED']).optional().default('DRAFT'),
  customer_name: z.string().max(200).optional().nullable(),
  industry: z.enum(['aerospace', 'energy', 'biomedical', 'semiconductor', 'machinery', 'marine', 'other']).optional().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  material: z.string().max(200).optional().nullable(),
  quantity: z.coerce.number().int().min(1).optional().nullable(),
  due_date: z.string().optional().nullable(),
  materials_available: z.boolean().optional().default(false),
  notes: z.string().optional().nullable(),
})

export type WorkOrderCreateInput = z.infer<typeof workOrderCreateSchema>

export const workOrderUpdateSchema = z.object({
  id: z.string().uuid(),
  wo_number: z.string().min(1).max(50).optional(),
  status: z.enum(['DRAFT', 'PLANNED', 'RELEASED', 'IN_PROGRESS', 'QC', 'COMPLETED', 'CLOSED']).optional(),
  customer_name: z.string().max(200).optional().nullable(),
  industry: z.enum(['aerospace', 'energy', 'biomedical', 'semiconductor', 'machinery', 'marine', 'other']).optional().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  material: z.string().max(200).optional().nullable(),
  quantity: z.coerce.number().int().min(1).optional().nullable(),
  due_date: z.string().optional().nullable(),
  materials_available: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

export type WorkOrderUpdateInput = z.infer<typeof workOrderUpdateSchema>

export const workOrderListSchema = z.object({
  id: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortField: z.string().optional().default('created_at'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.string().optional(),
  priority: z.string().optional(),
  industry: z.string().optional(),
  customer_name: z.string().optional(),
  wo_number: z.string().optional(),
  withDeleted: z.coerce.boolean().optional().default(false),
}).passthrough()

export const inspectionCreateSchema = z.object({
  inspection_number: z.string().min(1).max(50),
  work_order_ref: z.string().max(50).optional().nullable(),
  inspector_name: z.string().max(200).optional().nullable(),
  result: z.enum(['PASS', 'FAIL', 'CONDITIONAL']).optional().nullable(),
  defect_description: z.string().optional().nullable(),
  inspection_date: z.string().optional().nullable(),
})

export type InspectionCreateInput = z.infer<typeof inspectionCreateSchema>

export const inspectionUpdateSchema = z.object({
  id: z.string().uuid(),
  inspection_number: z.string().min(1).max(50).optional(),
  work_order_ref: z.string().max(50).optional().nullable(),
  inspector_name: z.string().max(200).optional().nullable(),
  result: z.enum(['PASS', 'FAIL', 'CONDITIONAL']).optional().nullable(),
  defect_description: z.string().optional().nullable(),
  inspection_date: z.string().optional().nullable(),
})

export type InspectionUpdateInput = z.infer<typeof inspectionUpdateSchema>

export const inspectionListSchema = z.object({
  id: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortField: z.string().optional().default('created_at'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  result: z.string().optional(),
  work_order_ref: z.string().optional(),
  inspector_name: z.string().optional(),
  withDeleted: z.coerce.boolean().optional().default(false),
}).passthrough()
