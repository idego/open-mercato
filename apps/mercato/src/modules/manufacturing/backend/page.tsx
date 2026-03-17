"use client"
import * as React from 'react'
import Link from 'next/link'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { useT } from '@open-mercato/shared/lib/i18n/context'

export default function ManufacturingPage() {
  const t = useT()

  return (
    <Page>
      <PageHeader
        title={t('manufacturing.page.title', 'Manufacturing')}
        description={t('manufacturing.page.description', 'Production management, work orders, and quality inspection tracking.')}
      />
      <PageBody>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/backend/work-orders"
            className="rounded-lg border p-6 hover:border-primary hover:bg-accent transition-colors"
          >
            <div className="text-lg font-semibold mb-1">
              {t('manufacturing.page.workOrders.title', 'Work Orders')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('manufacturing.page.workOrders.description', 'Manage production jobs, track status, materials, and scheduling across CNC operations.')}
            </div>
          </Link>
          <Link
            href="/backend/inspections"
            className="rounded-lg border p-6 hover:border-primary hover:bg-accent transition-colors"
          >
            <div className="text-lg font-semibold mb-1">
              {t('manufacturing.page.inspections.title', 'Inspection Records')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('manufacturing.page.inspections.description', 'Quality inspection tracking for AS 9100 compliance, dimensional reports, and pass/fail records.')}
            </div>
          </Link>
        </div>
      </PageBody>
    </Page>
  )
}
