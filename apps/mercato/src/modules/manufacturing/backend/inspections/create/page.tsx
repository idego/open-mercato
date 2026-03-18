"use client"
import * as React from 'react'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { CrudForm, type CrudField, type CrudFormGroup } from '@open-mercato/ui/backend/CrudForm'
import { createCrud } from '@open-mercato/ui/backend/utils/crud'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type WoOption = { id: string; wo_number: string; customer_name: string | null; status: string }
type WoListResponse = { items: WoOption[] }

export default function CreateInspectionPage() {
  const t = useT()

  const fields = React.useMemo<CrudField[]>(() => [
    { id: 'inspection_number', label: t('manufacturing.inspections.form.number', 'Inspection Number'), type: 'text', required: true, placeholder: 'INS-001' },
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
    { id: 'inspection_date', label: t('manufacturing.inspections.form.date', 'Inspection Date'), type: 'datepicker' },
    { id: 'defect_description', label: t('manufacturing.inspections.form.defects', 'Defect Description'), type: 'textarea' },
  ], [t])

  const groups = React.useMemo<CrudFormGroup[]>(() => [
    { id: 'inspection', title: t('manufacturing.inspections.form.groups.inspection', 'Inspection Details'), column: 1, fields: ['inspection_number', 'work_order_ref', 'inspector_name', 'inspection_date'] },
    { id: 'results', title: t('manufacturing.inspections.form.groups.results', 'Results'), column: 2, fields: ['result', 'defect_description'] },
  ], [t])

  const successRedirect = React.useMemo(
    () => `/backend/inspections?flash=${encodeURIComponent(t('manufacturing.inspections.form.flash.created', 'Inspection record created'))}&type=success`,
    [t],
  )

  return (
    <Page>
      <PageBody>
        <CrudForm
          title={t('manufacturing.inspections.form.create.title', 'New Inspection Record')}
          backHref="/backend/inspections"
          fields={fields}
          groups={groups}
          initialValues={{}}
          submitLabel={t('manufacturing.inspections.form.create.submit', 'Create Inspection')}
          cancelHref="/backend/inspections"
          successRedirect={successRedirect}
          onSubmit={async (vals) => { await createCrud('manufacturing/inspections', vals) }}
        />
      </PageBody>
    </Page>
  )
}
