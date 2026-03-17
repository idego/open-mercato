"use client"
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { CrudForm, type CrudField, type CrudFormGroup } from '@open-mercato/ui/backend/CrudForm'
import { fetchCrudList, updateCrud, deleteCrud } from '@open-mercato/ui/backend/utils/crud'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { pushWithFlash } from '@open-mercato/ui/backend/utils/flash'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import type { InspectionListItem } from '../../../../types'

type WoOption = { id: string; wo_number: string; customer_name: string | null; status: string }
type WoListResponse = { items: WoOption[] }

type FormValues = {
  id: string
  inspection_number: string
  work_order_ref: string
  inspector_name: string
  result: string
  inspection_date: string
  defect_description: string
}

export default function EditInspectionPage({ params }: { params?: { id?: string } }) {
  const t = useT()
  const router = useRouter()
  const id = params?.id
  const [initial, setInitial] = React.useState<FormValues | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)

  const fields = React.useMemo<CrudField[]>(() => [
    { id: 'inspection_number', label: t('manufacturing.inspections.form.number', 'Inspection Number'), type: 'text', required: true },
    {
      id: 'work_order_ref',
      label: t('manufacturing.inspections.form.workOrder', 'Work Order'),
      type: 'combobox',
      required: true,
      allowCustomValues: false,
      loadOptions: async (query?: string) => {
        const params = new URLSearchParams({ pageSize: '100', sortField: 'created_at', sortDir: 'desc' })
        if (query) params.set('wo_number', query)
        const call = await apiCall<WoListResponse>(`/api/manufacturing/work-orders?${params}`)
        return (call.result?.items ?? []).map(wo => ({
          value: wo.wo_number,
          label: `${wo.wo_number} — ${wo.customer_name ?? 'No customer'} (${wo.status})`,
        }))
      },
    },
    { id: 'inspector_name', label: t('manufacturing.inspections.form.inspector', 'Inspector'), type: 'text' },
    {
      id: 'result', label: t('manufacturing.inspections.form.result', 'Result'), type: 'select',
      options: [
        { value: 'PASS', label: 'Pass' },
        { value: 'FAIL', label: 'Fail' },
        { value: 'CONDITIONAL', label: 'Conditional' },
      ],
    },
    { id: 'inspection_date', label: t('manufacturing.inspections.form.date', 'Inspection Date'), type: 'text', placeholder: 'YYYY-MM-DD' },
    { id: 'defect_description', label: t('manufacturing.inspections.form.defects', 'Defect Description'), type: 'textarea' },
  ], [t])

  const groups = React.useMemo<CrudFormGroup[]>(() => [
    { id: 'inspection', title: t('manufacturing.inspections.form.groups.inspection', 'Inspection Details'), column: 1, fields: ['inspection_number', 'work_order_ref', 'inspector_name', 'inspection_date'] },
    { id: 'results', title: t('manufacturing.inspections.form.groups.results', 'Results'), column: 2, fields: ['result', 'defect_description'] },
  ], [t])

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      setLoading(true)
      setErr(null)
      try {
        const data = await fetchCrudList<InspectionListItem>('manufacturing/inspections', { id, pageSize: 1 })
        const item = data?.items?.[0]
        if (!item) throw new Error(t('manufacturing.inspections.form.error.notFound', 'Inspection record not found'))
        if (!cancelled) {
          setInitial({
            id: item.id,
            inspection_number: item.inspection_number ?? '',
            work_order_ref: item.work_order_ref ?? '',
            inspector_name: item.inspector_name ?? '',
            result: item.result ?? '',
            inspection_date: item.inspection_date ?? '',
            defect_description: item.defect_description ?? '',
          })
        }
      } catch (error: unknown) {
        if (!cancelled) setErr(error instanceof Error ? error.message : t('manufacturing.inspections.form.error.load', 'Failed to load'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, t])

  const successRedirect = React.useMemo(
    () => `/backend/inspections?flash=${encodeURIComponent(t('manufacturing.inspections.form.flash.saved', 'Inspection record saved'))}&type=success`,
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
            title={t('manufacturing.inspections.form.edit.title', 'Edit Inspection Record')}
            backHref="/backend/inspections"
            fields={fields}
            groups={groups}
            initialValues={initial ?? { id: id ?? '', inspection_number: '', work_order_ref: '', inspector_name: '', result: '', inspection_date: '', defect_description: '' }}
            submitLabel={t('manufacturing.inspections.form.edit.submit', 'Save Inspection')}
            cancelHref="/backend/inspections"
            successRedirect={successRedirect}
            isLoading={loading}
            loadingMessage={t('common.loading', 'Loading...')}
            onSubmit={async (vals) => { await updateCrud('manufacturing/inspections', vals) }}
            onDelete={async () => {
              if (!id) return
              try {
                await deleteCrud('manufacturing/inspections', id)
                pushWithFlash(router, '/backend/inspections', t('manufacturing.inspections.form.flash.deleted', 'Inspection record deleted'), 'success')
              } catch (error) {
                setErr(error instanceof Error ? error.message : t('manufacturing.inspections.form.error.delete', 'Failed to delete'))
              }
            }}
          />
        )}
      </PageBody>
    </Page>
  )
}
