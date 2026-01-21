// In production (static export), use empty string for same-origin requests
// In development, use localhost:3000
// Updated: Now includes credentials for session authentication
const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:3000')

class APIError extends Error {
  constructor(public status: number, message: string, public response?: any) {
    super(message)
    this.name = 'APIError'
  }
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include', // Include cookies for session auth
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      throw new APIError(res.status, `API error: ${res.statusText}`)
    }

    return res.json()
  },

  async post<T>(path: string, data?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include', // Include cookies for session auth
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!res.ok) {
      // Try to parse error response body for more details
      let errorMessage = `API error: ${res.statusText}`
      let errorData = null
      try {
        errorData = await res.json()
        if (errorData.error) {
          errorMessage = errorData.error
        }
        if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch (e) {
        // If parsing fails, use statusText
      }
      const error = new APIError(res.status, errorMessage, errorData)
      throw error
    }

    return res.json()
  },

  async patch<T>(path: string, data: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      credentials: 'include', // Include cookies for session auth
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      throw new APIError(res.status, `API error: ${res.statusText}`)
    }

    return res.json()
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      credentials: 'include', // Include cookies for session auth
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      throw new APIError(res.status, `API error: ${res.statusText}`)
    }

    return res.json()
  },
}

// Export API_BASE for use in components
export { API_BASE }
