"use client"
import * as React from 'react'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { CrudForm, type CrudField, type CrudFormGroup } from '@open-mercato/ui/backend/CrudForm'
import { createCrud } from '@open-mercato/ui/backend/utils/crud'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type CustomerOption = { id: string; display_name?: string; kind?: string }
type CustomerListResponse = { items: CustomerOption[] }

export default function CreateWorkOrderPage() {
  const t = useT()

  const loadCustomerOptions = React.useCallback(async (query?: string) => {
    const params = new URLSearchParams({ page: '1', pageSize: '20' })
    if (query?.trim()) params.set('search', query.trim())
    const call = await apiCall<CustomerListResponse>(`/api/customers/companies?${params}`)
    return (call.result?.items ?? []).map(c => ({ value: c.id, label: c.display_name ?? c.id }))
  }, [])

  const fields = React.useMemo<CrudField[]>(() => [
    { id: 'wo_number', label: t('manufacturing.workOrders.form.woNumber', 'WO Number'), type: 'text', required: true, placeholder: 'WO-2026-001' },
    {
      id: 'status', label: t('manufacturing.workOrders.form.status', 'Status'), type: 'select',
      options: [
        { value: 'DRAFT', label: 'Draft' }, { value: 'PLANNED', label: 'Planned' },
        { value: 'RELEASED', label: 'Released' }, { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'QC', label: 'Quality Control' }, { value: 'COMPLETED', label: 'Completed' },
        { value: 'CLOSED', label: 'Closed' },
      ],
    },
    {
      id: 'customer_entity_id',
      label: t('manufacturing.workOrders.form.customer', 'Customer'),
      type: 'combobox',
      loadOptions: loadCustomerOptions,
    },
    {
      id: 'industry', label: t('manufacturing.workOrders.form.industry', 'Industry'), type: 'select',
      options: [
        { value: 'aerospace', label: 'Aerospace' }, { value: 'energy', label: 'Energy' },
        { value: 'biomedical', label: 'Biomedical' }, { value: 'semiconductor', label: 'Semiconductor' },
        { value: 'machinery', label: 'General Machinery' }, { value: 'marine', label: 'Marine' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'priority', label: t('manufacturing.workOrders.form.priority', 'Priority'), type: 'select',
      options: [
        { value: 'LOW', label: 'Low' }, { value: 'NORMAL', label: 'Normal' },
        { value: 'HIGH', label: 'High' }, { value: 'URGENT', label: 'Urgent' },
      ],
    },
    { id: 'material', label: t('manufacturing.workOrders.form.material', 'Material'), type: 'text', placeholder: 'e.g. Inconel 718' },
    { id: 'quantity', label: t('manufacturing.workOrders.form.quantity', 'Quantity'), type: 'number' },
    { id: 'due_date', label: t('manufacturing.workOrders.form.dueDate', 'Due Date'), type: 'datepicker' },
    { id: 'materials_available', label: t('manufacturing.workOrders.form.materialsAvailable', 'Materials Available'), type: 'checkbox' },
    { id: 'notes', label: t('manufacturing.workOrders.form.notes', 'Notes'), type: 'textarea' },
  ], [t, loadCustomerOptions])

  const groups = React.useMemo<CrudFormGroup[]>(() => [
    { id: 'order', title: t('manufacturing.workOrders.form.groups.order', 'Order Details'), column: 1, fields: ['wo_number', 'customer_entity_id', 'industry', 'material', 'quantity', 'due_date'] },
    { id: 'status', title: t('manufacturing.workOrders.form.groups.status', 'Status & Priority'), column: 2, fields: ['status', 'priority', 'materials_available', 'notes'] },
  ], [t])

  const successRedirect = React.useMemo(
    () => `/backend/work-orders?flash=${encodeURIComponent(t('manufacturing.workOrders.form.flash.created', 'Work order created'))}&type=success`,
    [t],
  )

  return (
    <Page>
      <PageBody>
        <CrudForm
          title={t('manufacturing.workOrders.form.create.title', 'New Work Order')}
          backHref="/backend/work-orders"
          fields={fields}
          groups={groups}
          initialValues={{ status: 'DRAFT', priority: 'NORMAL', materials_available: false }}
          submitLabel={t('manufacturing.workOrders.form.create.submit', 'Create Work Order')}
          cancelHref="/backend/work-orders"
          successRedirect={successRedirect}
          onSubmit={async (vals) => { await createCrud('manufacturing/work-orders', vals) }}
        />
      </PageBody>
    </Page>
  )
}
