import type { ModuleInfo } from '@open-mercato/shared/modules/registry'

export const metadata: ModuleInfo = {
  name: 'calendar-export',
  title: 'Calendar Export',
  version: '0.1.0',
  description: 'Add to Calendar action for Deal and Person detail pages.',
  requires: ['customers'],
}
