/**
 * Authentication store using Zustand
 * Manages user authentication state
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import cognito from '../services/cognito'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      initialize: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const session = await cognito.getCurrentSession()
          
          if (session && session.isValid()) {
            const token = session.getIdToken().getJwtToken()
            const user = await cognito.getCurrentUser()
            
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            })
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            })
          }
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const session = await cognito.signIn({ email, password })
          const token = session.getIdToken().getJwtToken()
          const user = await cognito.getCurrentUser()
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed'
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          })
          throw error
        }
      },

      logout: () => {
        cognito.signOut()
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'dfw-auth-storage',
      partialize: (state) => ({
        // Only persist non-sensitive data
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Initialize auth on app load
if (typeof window !== 'undefined') {
  useAuthStore.getState().initialize()
}

