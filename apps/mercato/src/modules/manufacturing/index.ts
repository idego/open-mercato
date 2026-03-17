import './commands/work-orders'
import './commands/inspections'
import type { ModuleInfo } from '@open-mercato/shared/modules/registry'

export const metadata: ModuleInfo = {
  name: 'manufacturing',
  title: 'Manufacturing',
  version: '0.2.0',
  description: 'Manufacturing demo module with work orders, inspection records, and production tracking.',
  author: 'Idego',
  license: 'MIT',
}

export { features } from './acl'
