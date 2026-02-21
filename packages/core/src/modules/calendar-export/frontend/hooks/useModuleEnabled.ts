'use client'

import { useMemo } from 'react'
import { getModules } from '@open-mercato/shared/lib/modules/registry'

export function useModuleEnabled(moduleId: string): boolean {
  return useMemo(() => {
    try {
      const modules = getModules()
      return modules.some((m) => m.id === moduleId)
    } catch {
      return false
    }
  }, [moduleId])
}
