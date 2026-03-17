import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['manufacturing.*'],
    admin: [
      'manufacturing.*',
      'manufacturing.work_orders.view',
      'manufacturing.work_orders.manage',
      'manufacturing.inspections.view',
      'manufacturing.inspections.manage',
    ],
    employee: [
      'manufacturing.view',
      'manufacturing.work_orders.view',
      'manufacturing.inspections.view',
    ],
  },
}

export default setup
