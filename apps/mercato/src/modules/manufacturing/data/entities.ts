import { Entity, PrimaryKey, Property } from '@mikro-orm/core'

@Entity({ tableName: 'manufacturing_work_orders' })
export class WorkOrder {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'wo_number', type: 'text' })
  woNumber!: string

  @Property({ type: 'text', default: 'DRAFT' })
  status: string = 'DRAFT'

  @Property({ name: 'customer_name', type: 'text', nullable: true })
  customerName?: string | null

  @Property({ type: 'text', nullable: true })
  industry?: string | null

  @Property({ type: 'text', default: 'NORMAL' })
  priority: string = 'NORMAL'

  @Property({ type: 'text', nullable: true })
  material?: string | null

  @Property({ type: 'integer', nullable: true })
  quantity?: number | null

  @Property({ name: 'due_date', type: 'text', nullable: true })
  dueDate?: string | null

  @Property({ name: 'materials_available', type: 'boolean', default: false })
  materialsAvailable: boolean = false

  @Property({ type: 'text', nullable: true })
  notes?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date(), onCreate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'manufacturing_inspection_records' })
export class InspectionRecord {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'inspection_number', type: 'text' })
  inspectionNumber!: string

  @Property({ name: 'work_order_ref', type: 'text', nullable: true })
  workOrderRef?: string | null

  @Property({ name: 'inspector_name', type: 'text', nullable: true })
  inspectorName?: string | null

  @Property({ type: 'text', nullable: true })
  result?: string | null

  @Property({ name: 'defect_description', type: 'text', nullable: true })
  defectDescription?: string | null

  @Property({ name: 'inspection_date', type: 'text', nullable: true })
  inspectionDate?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date(), onCreate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}
