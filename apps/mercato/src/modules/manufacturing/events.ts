import { createModuleEvents } from '@open-mercato/shared/modules/events'

const events = [
  { id: 'manufacturing.work_order.created', label: 'Work Order Created', entity: 'work_order', category: 'crud', clientBroadcast: true },
  { id: 'manufacturing.work_order.updated', label: 'Work Order Updated', entity: 'work_order', category: 'crud', clientBroadcast: true },
  { id: 'manufacturing.work_order.deleted', label: 'Work Order Deleted', entity: 'work_order', category: 'crud', clientBroadcast: true },
  { id: 'manufacturing.inspection_record.created', label: 'Inspection Record Created', entity: 'inspection_record', category: 'crud', clientBroadcast: true },
  { id: 'manufacturing.inspection_record.updated', label: 'Inspection Record Updated', entity: 'inspection_record', category: 'crud', clientBroadcast: true },
  { id: 'manufacturing.inspection_record.deleted', label: 'Inspection Record Deleted', entity: 'inspection_record', category: 'crud', clientBroadcast: true },
] as const

export const eventsConfig = createModuleEvents({
  moduleId: 'manufacturing',
  events,
})

export const emitManufacturingEvent = eventsConfig.emit
export type ManufacturingEventId = typeof events[number]['id']

export default eventsConfig
