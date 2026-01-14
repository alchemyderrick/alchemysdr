'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react'

export default function XAuthPopup() {
  const [status, setStatus] = useState<'waiting' | 'processing' | 'success' | 'error'>('waiting')
  const [message, setMessage] = useState('')

  const handleStartAuth = async () => {
    try {
      setStatus('processing')
      setMessage('Triggering server-side authentication...')

      // Call server endpoint to start Puppeteer authentication
      const response = await fetch('/api/x-auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (result.ok) {
        setStatus('success')
        setMessage('X authentication successful!')

        // Notify parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'x-auth-complete',
            success: true
          }, '*')
        }

        // Auto-close after 2 seconds
        setTimeout(() => {
          window.close()
        }, 2000)
      } else {
        throw new Error(result.error || 'Authentication failed')
      }
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Authentication failed')

      if (window.opener) {
        window.opener.postMessage({
          type: 'x-auth-error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }, '*')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              X/Twitter Authentication
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click the button below to start the authentication process
            </p>
          </div>

          {status === 'waiting' && (
            <div className="space-y-4">
              <button
                onClick={handleStartAuth}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-5 w-5" />
                Start X Authentication
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                A browser window will open for you to log into X/Twitter.
                <br />
                Your credentials will be securely saved for this employee account.
              </p>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{message}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  A browser window will open. Please log in to X/Twitter.
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <Check className="h-12 w-12 mx-auto text-green-600" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-green-600">{message}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This window will close automatically...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-red-600" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-red-600">Authentication Failed</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
                <div className="flex gap-2 justify-center pt-2">
                  <button
                    onClick={handleStartAuth}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.close()}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
