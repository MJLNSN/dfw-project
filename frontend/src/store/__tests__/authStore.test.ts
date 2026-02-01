import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../authStore'

// Mock cognito service
vi.mock('../../services/cognito', () => ({
  default: {
    signOut: vi.fn(),
    getCurrentSession: vi.fn().mockResolvedValue(null),
    getCurrentUser: vi.fn().mockResolvedValue(null),
    signIn: vi.fn(),
  },
}))

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  })

  it('should initialize with default values', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should set user on login', () => {
    const { setUser } = useAuthStore.getState()
    
    const user = {
      id: 'user-123',
      email: 'test@example.com',
    }
    
    setUser(user)
    
    const state = useAuthStore.getState()
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
  })

  it('should set token', () => {
    const { setToken } = useAuthStore.getState()
    
    setToken('jwt-token-here')
    
    const state = useAuthStore.getState()
    expect(state.token).toBe('jwt-token-here')
  })

  it('should clear user on logout', () => {
    const { setUser, logout } = useAuthStore.getState()
    
    // First login
    setUser({ id: 'user-123', email: 'test@example.com' })
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    
    // Then logout
    logout()
    
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should set and clear error', () => {
    const { setError, clearError } = useAuthStore.getState()
    
    setError('Test error message')
    expect(useAuthStore.getState().error).toBe('Test error message')
    
    clearError()
    expect(useAuthStore.getState().error).toBeNull()
  })

  it('should handle null user correctly', () => {
    const { setUser } = useAuthStore.getState()
    
    // Set user
    setUser({ id: 'user-123', email: 'test@example.com' })
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    
    // Set null user
    setUser(null)
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('should preserve other state when setting token', () => {
    const { setUser, setToken } = useAuthStore.getState()
    
    // Set user first
    setUser({ id: 'user-123', email: 'test@example.com' })
    
    // Then set token
    setToken('new-token')
    
    const state = useAuthStore.getState()
    expect(state.user).not.toBeNull()
    expect(state.token).toBe('new-token')
  })
})

describe('AuthStore - Edge Cases', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it('should handle empty email', () => {
    const { setUser } = useAuthStore.getState()
    
    setUser({ id: 'user-123', email: '' })
    
    const state = useAuthStore.getState()
    expect(state.user?.email).toBe('')
    expect(state.isAuthenticated).toBe(true)
  })

  it('should handle very long token', () => {
    const { setToken } = useAuthStore.getState()
    
    const longToken = 'a'.repeat(10000)
    setToken(longToken)
    
    expect(useAuthStore.getState().token).toBe(longToken)
  })

  it('should handle multiple rapid state changes', () => {
    const { setUser, setToken, logout } = useAuthStore.getState()
    
    // Rapid changes
    setUser({ id: '1', email: 'a@test.com' })
    setToken('token1')
    setUser({ id: '2', email: 'b@test.com' })
    setToken('token2')
    logout()
    setUser({ id: '3', email: 'c@test.com' })
    
    const state = useAuthStore.getState()
    expect(state.user?.id).toBe('3')
    expect(state.user?.email).toBe('c@test.com')
    expect(state.isAuthenticated).toBe(true)
  })
})

