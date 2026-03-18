export type WorkOrderListItem = {
  id: string
  wo_number: string
  status: string
  customer_entity_id: string | null
  customer_name: string | null
  industry: string | null
  priority: string
  material: string | null
  quantity: number | null
  due_date: string | null
  materials_available: boolean
  tenant_id: string | null
  organization_id: string | null
}

export type InspectionListItem = {
  id: string
  inspection_number: string
  work_order_ref: string | null
  inspector_name: string | null
  result: string | null
  defect_description: string | null
  inspection_date: string | null
  tenant_id: string | null
  organization_id: string | null
}
