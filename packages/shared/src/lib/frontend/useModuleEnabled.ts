'use client'
import { useMemo } from 'react'
import { useModules } from './ModulesContext'

export function useModuleEnabled(moduleId: string): boolean {
  const modules = useModules()
  return useMemo(() => modules.some((m) => m.id === moduleId), [modules, moduleId])
}
