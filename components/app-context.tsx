'use client'

import { createContext, useContext } from 'react'
import type { Member, Profile } from '@/lib/types'

export interface AppContextValue {
  me: Profile
  email: string | null
  members: Member[]
  memberMap: Map<string, Member>
  unread: number
  refreshMe: () => Promise<void>
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp va usato dentro AppShell')
  return value
}

export function useAppMaybe(): AppContextValue | null {
  return useContext(AppContext)
}

export function useMe(): Profile {
  return useApp().me
}
