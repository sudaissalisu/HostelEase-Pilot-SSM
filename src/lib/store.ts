import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
}

interface AuthState {
  user: SessionUser | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
    }),
    { name: 'ssm-pilot-auth-store' }
  )
)

// Router store stub — the pilot uses Next.js router, not a custom SPA router
export const useRouterStore = create<{
  view: string
  setView: (v: string) => void
}>()(
  persist(
    (set) => ({
      view: '',
      setView: (v) => set({ view: v }),
    }),
    { name: 'ssm-pilot-router' }
  )
)

export type ViewKey = string
