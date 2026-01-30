/**
 * Email verification page
 */
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { confirmSignUp, resendConfirmationCode } from '../services/cognito'

interface VerifyFormData {
  code: string
}

export default function VerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyFormData>()

  const onSubmit = async (data: VerifyFormData) => {
    if (!email) {
      toast.error('Please start from the registration page')
      navigate('/register')
      return
    }

    setIsSubmitting(true)

    try {
      await confirmSignUp({ email, code: data.code })
      toast.success('Email verified! You can now sign in.')
      navigate('/login')
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Verification failed. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      toast.error('Please start from the registration page')
      navigate('/register')
      return
    }

    setIsResending(true)

    try {
      await resendConfirmationCode(email)
      toast.success('Verification code sent!')
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to resend code. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-primary-500/10 via-transparent to-transparent" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-accent-500/10 via-transparent to-transparent" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Icon */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20 mb-6">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Verify your email</h1>
          <p className="mt-2 text-slate-400">
            We sent a code to <span className="text-white font-medium">{email || 'your email'}</span>
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="glass rounded-2xl p-8 space-y-6 animate-slide-up"
        >
          {/* Code Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Verification code
            </label>
            <input
              type="text"
              {...register('code', {
                required: 'Verification code is required',
                minLength: {
                  value: 6,
                  message: 'Code must be 6 characters',
                },
                maxLength: {
                  value: 6,
                  message: 'Code must be 6 characters',
                },
              })}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-center text-2xl tracking-widest placeholder-slate-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors font-mono"
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-400">{errors.code.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="spinner" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>

          {/* Resend */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {isResending ? 'Sending...' : "Didn't receive a code? Resend"}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center animate-fade-in animate-stagger-2">
          <Link
            to="/login"
            className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

