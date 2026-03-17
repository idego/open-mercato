"use client"
import * as React from 'react'
import Link from 'next/link'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { flash } from '@open-mercato/ui/backend/FlashMessages'

type InspectionRow = {
  id: string
  inspection_number: string
  work_order_ref: string | null
  inspector_name: string | null
  result: string | null
  inspection_date: string | null
}

type ListResponse = {
  items: InspectionRow[]
  total: number
  totalPages: number
}

const RESULT_COLORS: Record<string, string> = {
  PASS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  CONDITIONAL: 'bg-yellow-100 text-yellow-800',
}

export default function InspectionsPage() {
  const t = useT()
  const [rows, setRows] = React.useState<InspectionRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const pageSize = 20

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      const call = await apiCall<ListResponse>(
        `/api/manufacturing/inspections?${params.toString()}`,
        undefined,
        { fallback: { items: [], total: 0, totalPages: 1 } },
      )
      if (cancelled) return
      if (!call.ok) {
        flash(t('manufacturing.inspections.error.load', 'Failed to load inspection records'), 'error')
        setIsLoading(false)
        return
      }
      const payload = call.result ?? { items: [], total: 0 }
      setRows(payload.items ?? [])
      setTotal(payload.total ?? 0)
      setIsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [page, t])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <Page>
      <PageHeader
        title={t('manufacturing.inspections.title', 'Inspection Records')}
        description={t('manufacturing.inspections.description', 'Quality inspection tracking for production orders.')}
      />
      <PageBody>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {total} {t('manufacturing.inspections.total', 'inspection records')}
          </div>
          <Button asChild size="sm">
            <Link href="/backend/inspections/create">
              {t('manufacturing.inspections.create', 'New Inspection')}
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            {t('common.loading', 'Loading...')}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {t('manufacturing.inspections.empty', 'No inspection records yet. Create your first inspection to get started.')}
          </div>
        ) : (
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.inspections.columns.number', 'Inspection #')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.inspections.columns.workOrder', 'Work Order')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.inspections.columns.inspector', 'Inspector')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.inspections.columns.result', 'Result')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.inspections.columns.date', 'Date')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/backend/inspections/${row.id}/edit`} className="font-medium text-primary hover:underline">
                        {row.inspection_number ?? '-'}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.work_order_ref ?? '-'}</td>
                    <td className="px-4 py-3">{row.inspector_name ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${RESULT_COLORS[row.result ?? ''] ?? 'bg-gray-100'}`}>
                        {row.result ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.inspection_date ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {t('common.previous', 'Previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('common.pageOf', 'Page {page} of {total}').replace('{page}', String(page)).replace('{total}', String(totalPages))}
                </span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  {t('common.next', 'Next')}
                </Button>
              </div>
            )}
          </div>
        )}
      </PageBody>
    </Page>
  )
}
