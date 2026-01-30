/**
 * Export to CSV button component
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useFilterStore } from '../../store/filterStore'
import { exportToCsv, downloadBlob } from '../../services/api'

export default function ExportButton() {
  const { isAuthenticated } = useAuthStore()
  const { filters } = useFilterStore()
  const navigate = useNavigate()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to export data')
      navigate('/login')
      return
    }

    setIsExporting(true)
    
    try {
      const blob = await exportToCsv(filters)
      const filename = `properties_export_${new Date().toISOString().split('T')[0]}.csv`
      downloadBlob(blob, filename)
      toast.success('Export completed!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`glass rounded-xl p-4 flex items-center gap-3 w-full transition-all animate-fade-in animate-stagger-4 ${
        isAuthenticated
          ? 'hover:border-primary-500/50 cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isAuthenticated
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            : 'bg-gray-200'
        }`}
      >
        {isExporting ? (
          <div className="spinner" />
        ) : (
          <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        )}
      </div>
      <div className="text-left flex-1">
        <span className="font-medium text-gray-900">Export CSV</span>
        <span className="text-xs text-gray-600 block">
          {isAuthenticated ? 'Download filtered data' : 'Sign in required'}
        </span>
      </div>
    </button>
  )
}

