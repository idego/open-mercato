"use client"
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { CrudForm, type CrudField, type CrudFormGroup } from '@open-mercato/ui/backend/CrudForm'
import { fetchCrudList, updateCrud, deleteCrud } from '@open-mercato/ui/backend/utils/crud'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { pushWithFlash } from '@open-mercato/ui/backend/utils/flash'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import type { WorkOrderListItem } from '../../../../types'

type CustomerOption = { id: string; display_name?: string; kind?: string }
type CustomerListResponse = { items: CustomerOption[] }

type FormValues = {
  id: string
  wo_number: string
  status: string
  customer_entity_id: string
  industry: string
  priority: string
  material: string
  quantity: number | null
  due_date: string
  materials_available: boolean
  notes: string
}

export default function EditWorkOrderPage({ params }: { params?: { id?: string } }) {
  const t = useT()
  const router = useRouter()
  const id = params?.id
  const [initial, setInitial] = React.useState<FormValues | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)

  const loadCustomerOptions = React.useCallback(async (query?: string) => {
    const params = new URLSearchParams({ page: '1', pageSize: '20' })
    if (query?.trim()) params.set('search', query.trim())
    const call = await apiCall<CustomerListResponse>(`/api/customers/companies?${params}`)
    return (call.result?.items ?? []).map(c => ({ value: c.id, label: c.display_name ?? c.id }))
  }, [])

  const fields = React.useMemo<CrudField[]>(() => [
    { id: 'wo_number', label: t('manufacturing.workOrders.form.woNumber', 'WO Number'), type: 'text', required: true },
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
    { id: 'material', label: t('manufacturing.workOrders.form.material', 'Material'), type: 'text' },
    { id: 'quantity', label: t('manufacturing.workOrders.form.quantity', 'Quantity'), type: 'number' },
    { id: 'due_date', label: t('manufacturing.workOrders.form.dueDate', 'Due Date'), type: 'datepicker' },
    { id: 'materials_available', label: t('manufacturing.workOrders.form.materialsAvailable', 'Materials Available'), type: 'checkbox' },
    { id: 'notes', label: t('manufacturing.workOrders.form.notes', 'Notes'), type: 'textarea' },
  ], [t, loadCustomerOptions])

  const groups = React.useMemo<CrudFormGroup[]>(() => [
    { id: 'order', title: t('manufacturing.workOrders.form.groups.order', 'Order Details'), column: 1, fields: ['wo_number', 'customer_entity_id', 'industry', 'material', 'quantity', 'due_date'] },
    { id: 'status', title: t('manufacturing.workOrders.form.groups.status', 'Status & Priority'), column: 2, fields: ['status', 'priority', 'materials_available', 'notes'] },
  ], [t])

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      setLoading(true)
      setErr(null)
      try {
        const data = await fetchCrudList<WorkOrderListItem>('manufacturing/work-orders', { id, pageSize: 1 })
        const item = data?.items?.[0]
        if (!item) throw new Error(t('manufacturing.workOrders.form.error.notFound', 'Work order not found'))
        if (!cancelled) {
          setInitial({
            id: item.id,
            wo_number: item.wo_number ?? '',
            status: item.status ?? 'DRAFT',
            customer_entity_id: item.customer_entity_id ?? '',
            industry: item.industry ?? '',
            priority: item.priority ?? 'NORMAL',
            material: item.material ?? '',
            quantity: item.quantity ?? null,
            due_date: item.due_date ?? '',
            materials_available: !!item.materials_available,
            notes: '',
          })
        }
      } catch (error: unknown) {
        if (!cancelled) setErr(error instanceof Error ? error.message : t('manufacturing.workOrders.form.error.load', 'Failed to load'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, t])

  const successRedirect = React.useMemo(
    () => `/backend/work-orders?flash=${encodeURIComponent(t('manufacturing.workOrders.form.flash.saved', 'Work order saved'))}&type=success`,
    [t],
  )

  if (!id) return null

  return (
    <Page>
      <PageBody>
        {err ? (
          <div className="text-red-600">{err}</div>
        ) : (
          <CrudForm<FormValues>
            title={t('manufacturing.workOrders.form.edit.title', 'Edit Work Order')}
            backHref="/backend/work-orders"
            fields={fields}
            groups={groups}
            initialValues={initial ?? { id: id ?? '', wo_number: '', status: 'DRAFT', customer_entity_id: '', industry: '', priority: 'NORMAL', material: '', quantity: null, due_date: '', materials_available: false, notes: '' }}
            submitLabel={t('manufacturing.workOrders.form.edit.submit', 'Save Work Order')}
            cancelHref="/backend/work-orders"
            successRedirect={successRedirect}
            isLoading={loading}
            loadingMessage={t('common.loading', 'Loading...')}
            onSubmit={async (vals) => { await updateCrud('manufacturing/work-orders', vals) }}
            onDelete={async () => {
              if (!id) return
              try {
                await deleteCrud('manufacturing/work-orders', id)
                pushWithFlash(router, '/backend/work-orders', t('manufacturing.workOrders.form.flash.deleted', 'Work order deleted'), 'success')
              } catch (error) {
                setErr(error instanceof Error ? error.message : t('manufacturing.workOrders.form.error.delete', 'Failed to delete'))
              }
            }}
          />
        )}
      </PageBody>
    </Page>
  )
}
