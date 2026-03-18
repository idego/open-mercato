"use client"
import * as React from 'react'
import Link from 'next/link'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { flash } from '@open-mercato/ui/backend/FlashMessages'

type WorkOrderRow = {
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
}

type ListResponse = {
  items: WorkOrderRow[]
  total: number
  totalPages: number
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PLANNED: 'bg-blue-100 text-blue-700',
  RELEASED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  QC: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-200 text-gray-600',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500',
  NORMAL: 'text-blue-600',
  HIGH: 'text-orange-600 font-medium',
  URGENT: 'text-red-600 font-bold',
}

export default function WorkOrdersPage() {
  const t = useT()
  const [rows, setRows] = React.useState<WorkOrderRow[]>([])
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
        `/api/manufacturing/work-orders?${params.toString()}`,
        undefined,
        { fallback: { items: [], total: 0, totalPages: 1 } },
      )
      if (cancelled) return
      if (!call.ok) {
        flash(t('manufacturing.workOrders.error.load', 'Failed to load work orders'), 'error')
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
        title={t('manufacturing.workOrders.title', 'Work Orders')}
        description={t('manufacturing.workOrders.description', 'Production job tracking and status management.')}
      />
      <PageBody>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {total} {t('manufacturing.workOrders.total', 'work orders')}
          </div>
          <Button asChild size="sm">
            <Link href="/backend/work-orders/create">
              {t('manufacturing.workOrders.create', 'New Work Order')}
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            {t('common.loading', 'Loading...')}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {t('manufacturing.workOrders.empty', 'No work orders yet. Create your first work order to get started.')}
          </div>
        ) : (
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.workOrders.columns.woNumber', 'WO #')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.workOrders.columns.status', 'Status')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.workOrders.columns.customer', 'Customer')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.workOrders.columns.industry', 'Industry')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.workOrders.columns.priority', 'Priority')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.workOrders.columns.material', 'Material')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.workOrders.columns.qty', 'Qty')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.workOrders.columns.dueDate', 'Due Date')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('manufacturing.workOrders.columns.materials', 'Materials')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/backend/work-orders/${row.id}/edit`} className="font-medium text-primary hover:underline">
                        {row.wo_number ?? '-'}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[row.status ?? ''] ?? 'bg-gray-100'}`}>
                        {row.status ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.customer_name ?? '-'}</td>
                    <td className="px-4 py-3 capitalize">{row.industry ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={PRIORITY_COLORS[row.priority ?? ''] ?? ''}>
                        {row.priority ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.material ?? '-'}</td>
                    <td className="px-4 py-3">{row.quantity ?? '-'}</td>
                    <td className="px-4 py-3">{row.due_date ?? '-'}</td>
                    <td className="px-4 py-3">
                      {row.materials_available ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-red-500">No</span>
                      )}
                    </td>
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
