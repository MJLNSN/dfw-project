/**
 * Modal for saving filter tags
 */
import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createPreference, getPreferences } from '../../services/api'
import type { FilterCriteria } from '../../types'

interface SavePreferenceModalProps {
  filters: FilterCriteria
  onClose: () => void
}

export default function SavePreferenceModal({ filters, onClose }: SavePreferenceModalProps) {
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const queryClient = useQueryClient()

  // Get existing preferences to check for duplicates
  const { data: preferencesData } = useQuery({
    queryKey: ['preferences'],
    queryFn: getPreferences,
  })

  const mutation = useMutation({
    mutationFn: () => createPreference({ name, filters, isDefault }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
      toast.success('Tag saved!')
      onClose()
    },
    onError: (error) => {
      console.error('Save tag error:', error)
      toast.error('Failed to save tag')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if name is empty
    if (!name.trim()) {
      toast.error('Please enter a tag name')
      return
    }

    // Check for duplicate names
    const existingPreferences = preferencesData?.data || []
    const isDuplicate = existingPreferences.some(
      (pref) => pref.name.toLowerCase() === name.trim().toLowerCase()
    )

    if (isDuplicate) {
      toast.error('A tag with this name already exists. Please choose a different name.')
      return
    }

    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in shadow-2xl">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Save Filter Tag</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tag Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Dallas Search"
              className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              autoFocus
            />
          </div>

          {/* Current Filters Display */}
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-semibold">
              Current Filters
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              {filters.priceRange?.min || filters.priceRange?.max ? (
                <div className="font-medium">
                  Price: ${filters.priceRange.min?.toLocaleString() || '0'} -{' '}
                  ${filters.priceRange.max?.toLocaleString() || '∞'}
                </div>
              ) : null}
              {filters.sizeRange?.min || filters.sizeRange?.max ? (
                <div className="font-medium">
                  Size: {filters.sizeRange.min?.toLocaleString() || '0'} -{' '}
                  {filters.sizeRange.max?.toLocaleString() || '∞'} sq ft
                </div>
              ) : null}
              {!filters.priceRange?.min &&
                !filters.priceRange?.max &&
                !filters.sizeRange?.min &&
                !filters.sizeRange?.max && (
                  <div className="text-gray-500">No filters applied</div>
                )}
            </div>
          </div>

          {/* Default Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 font-medium">Set as default</label>
            <button
              type="button"
              onClick={() => setIsDefault(!isDefault)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isDefault ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                  isDefault ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {mutation.isPending ? (
                <>
                  <div className="spinner" />
                  Saving...
                </>
              ) : (
                'Save Tag'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

