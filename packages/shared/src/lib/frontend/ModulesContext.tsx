'use client'
import React, { createContext, useContext } from 'react'

type ModuleEntry = { id: string }

const ModulesContext = createContext<ModuleEntry[]>([])

export function ModulesProvider({
  modules,
  children,
}: {
  modules: ModuleEntry[]
  children: React.ReactNode
}) {
  return <ModulesContext.Provider value={modules}>{children}</ModulesContext.Provider>
}

export function useModules(): ModuleEntry[] {
  return useContext(ModulesContext)
}
