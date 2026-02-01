/**
 * Export to CSV button component
 * Opens export configuration modal
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import ExportModal from './ExportModal'

export default function ExportButton() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleClick = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to export data')
      navigate('/login')
      return
    }
    setIsModalOpen(true)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
          isAuthenticated
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white cursor-pointer'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </div>
        <div className="text-left flex-1">
          <span className="font-medium">Export CSV</span>
          <span className="text-xs opacity-80 block">
            {isAuthenticated ? 'Distance & sorting options' : 'Sign in required'}
          </span>
        </div>
        <svg className="w-5 h-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {isModalOpen && <ExportModal onClose={() => setIsModalOpen(false)} />}
    </>
  )
}

