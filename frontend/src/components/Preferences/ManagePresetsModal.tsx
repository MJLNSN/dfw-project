/**
 * Modal for managing saved filter tags
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { deletePreference } from '../../services/api'
import type { Preference } from '../../types'

interface ManagePresetsModalProps {
  presets: Preference[]
  onClose: () => void
}

export default function ManagePresetsModal({ presets, onClose }: ManagePresetsModalProps) {
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePreference(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
      toast.success('Tag deleted!')
      setDeletingId(null)
    },
    onError: (error) => {
      console.error('Delete tag error:', error)
      toast.error('Failed to delete tag')
      setDeletingId(null)
    },
  })

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete tag "${name}"?`)) {
      setDeletingId(id)
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Manage Tags</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {presets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className="text-sm">No saved tags yet.</p>
            <p className="text-xs mt-1">Use Advanced Filters to create one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏷️</span>
                    <span className="text-sm font-medium text-gray-800">
                      {preset.name}
                    </span>
                    {preset.isDefault && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-7">
                    {preset.filters.priceRange?.min || preset.filters.priceRange?.max ? (
                      <span>
                        Price: ${preset.filters.priceRange.min?.toLocaleString() || '0'} - 
                        ${preset.filters.priceRange.max?.toLocaleString() || '∞'}
                      </span>
                    ) : null}
                    {preset.filters.sizeRange?.min || preset.filters.sizeRange?.max ? (
                      <span className="ml-2">
                        Size: {preset.filters.sizeRange.min?.toLocaleString() || '0'} - 
                        {preset.filters.sizeRange.max?.toLocaleString() || '∞'} sq ft
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(preset.id, preset.name)}
                  disabled={deletingId === preset.id}
                  className="ml-3 p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Delete tag"
                >
                  {deletingId === preset.id ? (
                    <div className="spinner w-4 h-4" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

