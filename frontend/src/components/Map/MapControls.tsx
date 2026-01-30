/**
 * Map controls panel - filters, style, export
 */
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMapStore, MAP_STYLES } from '../../store/mapStore'
import { useFilterStore, QUICK_FILTERS } from '../../store/filterStore'
import { useAuthStore } from '../../store/authStore'
import FilterPanel from '../Filters/FilterPanel'
import ExportButton from '../Export/ExportButton'
import SavePreferenceModal from '../Preferences/SavePreferenceModal'
import ManagePresetsModal from '../Preferences/ManagePresetsModal'
import { getPreferences } from '../../services/api'

type SectionType = 'stats' | 'quickFilters' | 'advancedFilters' | 'mapStyle' | 'export'

export default function MapControls() {
  const { isAuthenticated } = useAuthStore()
  const { mapStyle, setMapStyle, showClusters, toggleClusters, totalParcels, accessLevel } =
    useMapStore()
  const { filters, applyPreset, clearFilters, savedPreferences, setSavedPreferences, setActivePreference, activePreferenceId } = useFilterStore()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<SectionType>>(
    new Set(['stats', 'quickFilters', 'advancedFilters', 'mapStyle', 'export'])
  )

  // Load saved preferences
  const { data: preferencesData } = useQuery({
    queryKey: ['preferences'],
    queryFn: getPreferences,
    enabled: isAuthenticated,
  })

  // Update store when preferences are loaded
  useEffect(() => {
    if (preferencesData?.data) {
      setSavedPreferences(preferencesData.data)
    }
  }, [preferencesData, setSavedPreferences])

  // Use isAuthenticated to conditionally show save modal option
  const canSavePreferences = isAuthenticated

  const hasActiveFilters =
    (filters.priceRange?.min !== null && filters.priceRange?.min !== undefined) ||
    (filters.priceRange?.max !== null && filters.priceRange?.max !== undefined) ||
    (filters.sizeRange?.min !== null && filters.sizeRange?.min !== undefined) ||
    (filters.sizeRange?.max !== null && filters.sizeRange?.max !== undefined)
  
  const handleQuickFilterClick = (preset: typeof QUICK_FILTERS[0]) => {
    applyPreset(preset.filters)
    setActiveQuickFilter(preset.name)
  }

  const handlePresetFilterClick = (preferenceId: string) => {
    setActivePreference(preferenceId)
    setActiveQuickFilter(null)
  }

  const toggleSection = (section: SectionType) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        // 缩小这个部分
        newSet.delete(section)
      } else {
        // 展开这个部分
        newSet.add(section)
        // 如果当前是全局缩小状态,展开这个部分时自动取消全局缩小
        if (isCollapsed) {
          setIsCollapsed(false)
        }
      }
      return newSet
    })
  }

  const toggleAllSections = () => {
    if (isCollapsed) {
      // Expand all
      setExpandedSections(new Set(['stats', 'quickFilters', 'advancedFilters', 'mapStyle', 'export']))
    } else {
      // Collapse all
      setExpandedSections(new Set())
    }
    setIsCollapsed(!isCollapsed)
  }

  return (
    <>
      {/* Collapse/Expand All Button - Separate Row */}
      <div className="absolute left-4 top-4 z-20">
        <button
          onClick={toggleAllSections}
          className="glass rounded-lg p-2 hover:bg-gray-100/50 transition-all"
          title={isCollapsed ? 'Expand all' : 'Collapse all'}
        >
          <svg
            className={`w-5 h-5 text-gray-700 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className={`absolute left-4 bottom-4 flex flex-col gap-4 z-10 overflow-y-auto transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'}`} style={{ top: '5rem', maxHeight: 'calc(100vh - 6rem)' }}>
        {/* Stats Card */}
        <div className={`glass rounded-xl animate-fade-in ${!expandedSections.has('stats') ? 'w-12' : ''}`}>
          {!expandedSections.has('stats') ? (
            <button 
              onClick={() => toggleSection('stats')}
              className="flex flex-col items-center justify-center w-12 h-12 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              <span className="text-2xl">📊</span>
            </button>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Properties</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      accessLevel === 'registered'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {accessLevel === 'registered' ? 'Full Access' : 'Dallas Only'}
                  </span>
                  <button
                    onClick={() => toggleSection('stats')}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="text-3xl font-bold text-gradient">
                {totalParcels.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {accessLevel === 'guest'
                  ? 'Register to see all counties'
                  : 'Viewing all DFW counties'}
              </p>
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className={`glass rounded-xl animate-fade-in animate-stagger-1 ${!expandedSections.has('quickFilters') ? 'w-12' : ''}`}>
          {!expandedSections.has('quickFilters') ? (
            <button 
              onClick={() => toggleSection('quickFilters')}
              className="flex flex-col items-center justify-center w-12 h-12 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              <span className="text-2xl">⚡</span>
            </button>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Quick Filters</h3>
                <button
                  onClick={() => toggleSection('quickFilters')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_FILTERS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleQuickFilterClick(preset)}
                    className={`p-3 rounded-lg border transition-all text-left group ${
                      activeQuickFilter === preset.name
                        ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-gray-100/50 hover:bg-gray-200/50 border-gray-200/50 hover:border-emerald-500/50'
                    }`}
                  >
                    <span className="text-xl mb-1 block">{preset.icon}</span>
                    <span className={`text-sm font-medium ${activeQuickFilter === preset.name ? 'text-emerald-700' : 'text-gray-800 group-hover:text-gray-900'}`}>
                      {preset.name}
                    </span>
                    <span className="text-xs text-gray-500 block">{preset.description}</span>
                  </button>
                ))}
              </div>
              
              {/* Saved Tags */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Your Saved Tags</div>
                {savedPreferences.length > 0 ? (
                  <div className="space-y-2">
                    {/* Tag Selector */}
                    <select
                      value={activePreferenceId || ''}
                      onChange={(e) => handlePresetFilterClick(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    >
                      <option value="">Select a saved tag...</option>
                      {savedPreferences.map((pref) => (
                        <option key={pref.id} value={pref.id}>
                          🏷️ {pref.name}
                        </option>
                      ))}
                    </select>
                    
                    {/* Manage Button */}
                    <button
                      onClick={() => setIsManageModalOpen(true)}
                      className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Manage Tags
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic p-2 bg-gray-50 rounded-lg">
                    {isAuthenticated 
                      ? 'No saved tags yet. Use Advanced Filters to create one.'
                      : 'Sign in to save custom filter tags.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        <div className={`glass rounded-xl animate-fade-in animate-stagger-2 ${!expandedSections.has('advancedFilters') ? 'w-12' : ''}`}>
          {!expandedSections.has('advancedFilters') ? (
            <button 
              onClick={() => toggleSection('advancedFilters')}
              className="flex flex-col items-center justify-center w-12 h-12 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              <span className="text-2xl">🔧</span>
            </button>
          ) : (
            <div className="p-4">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`w-full flex items-center justify-between transition-all ${
                hasActiveFilters ? 'border-emerald-500/50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    hasActiveFilters
                      ? 'bg-gradient-to-br from-primary-500 to-accent-500'
                      : 'bg-gray-200'
                  }`}
                >
                  <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <span className="font-medium text-gray-900">Advanced Filters</span>
                  {hasActiveFilters && (
                    <span className="text-xs text-emerald-600 block">Filters active</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${
                    isFilterOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSection('advancedFilters')
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </button>

            {/* Filter Panel */}
            {isFilterOpen && (
              <FilterPanel
                onClose={() => setIsFilterOpen(false)}
                onSave={canSavePreferences ? () => setIsSaveModalOpen(true) : undefined}
                onApply={() => {
                  // Filters are already applied via store, just close the panel
                  setIsFilterOpen(false)
                }}
              />
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  clearFilters()
                  setActiveQuickFilter(null)
                }}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors mt-2"
              >
                Clear all filters
              </button>
            )}
            </div>
          )}
        </div>

        {/* Map Style */}
        <div className={`glass rounded-xl animate-fade-in animate-stagger-3 ${!expandedSections.has('mapStyle') ? 'w-12' : ''}`}>
          {!expandedSections.has('mapStyle') ? (
            <button 
              onClick={() => toggleSection('mapStyle')}
              className="flex flex-col items-center justify-center w-12 h-12 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              <span className="text-2xl">🗺️</span>
            </button>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Map Style</h3>
                <button
                  onClick={() => toggleSection('mapStyle')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((style) => (
                  <button
                    key={style}
                    onClick={() => setMapStyle(style)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                      mapStyle === style
                        ? 'bg-emerald-500 text-gray-900'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {style === 'dark' ? '🌙 Dark' : style === 'satellite' ? '🛰️ Satellite' : '🗺️ Streets'}
                  </button>
                ))}
              </div>
              
              {/* Cluster Toggle */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Show clusters</span>
                <button
                  onClick={toggleClusters}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    showClusters ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      showClusters ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export Button */}
        <div className={`glass rounded-xl animate-fade-in animate-stagger-4 ${!expandedSections.has('export') ? 'w-12' : ''}`}>
          {!expandedSections.has('export') ? (
            <button 
              onClick={() => toggleSection('export')}
              className="flex flex-col items-center justify-center w-12 h-12 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              <span className="text-2xl">📥</span>
            </button>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Export</h3>
                <button
                  onClick={() => toggleSection('export')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              <ExportButton />
            </div>
          )}
        </div>
      </div>

      {/* Save Preference Modal */}
      {isSaveModalOpen && (
        <SavePreferenceModal
          filters={filters}
          onClose={() => setIsSaveModalOpen(false)}
        />
      )}

      {/* Manage Presets Modal */}
      {isManageModalOpen && (
        <ManagePresetsModal
          presets={savedPreferences}
          onClose={() => setIsManageModalOpen(false)}
        />
      )}
    </>
  )
}

