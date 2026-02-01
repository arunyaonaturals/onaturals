'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'

interface Area {
  id: number
  name: string
}

interface Store {
  id: number
  name: string
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  gstNumber: string | null
  contactPerson: string | null
  areaId: number | null
  area: Area | null
  marginDiscountPercent: number | null
  isActive: boolean
}

export function StoresClient({ isAdmin }: { isAdmin: boolean }) {
  const [stores, setStores] = useState<Store[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [filterArea, setFilterArea] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    gstNumber: '',
    contactPerson: '',
    areaId: '',
    marginDiscountPercent: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStores()
    fetchAreas()
  }, [filterArea, showInactive])

  const fetchStores = async () => {
    try {
      let url = '/api/stores?'
      if (filterArea) url += `areaId=${filterArea}&`
      if (!showInactive) url += 'isActive=true'

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setStores(data)
      }
    } catch {
      console.error('Failed to fetch stores')
    } finally {
      setLoading(false)
    }
  }

  const fetchAreas = async () => {
    try {
      const res = await fetch('/api/areas')
      if (res.ok) {
        const data = await res.json()
        setAreas(data)
      }
    } catch {
      console.error('Failed to fetch areas')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const url = editingStore ? `/api/stores/${editingStore.id}` : '/api/stores'
      const method = editingStore ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingStore(null)
        resetForm()
        fetchStores()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save store')
      }
    } catch {
      setError('An error occurred')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
      gstNumber: '',
      contactPerson: '',
      areaId: '',
      marginDiscountPercent: '',
    })
  }

  const handleEdit = (store: Store) => {
    setEditingStore(store)
    setFormData({
      name: store.name,
      address: store.address || '',
      city: store.city || '',
      state: store.state || '',
      pincode: store.pincode || '',
      phone: store.phone || '',
      email: store.email || '',
      gstNumber: store.gstNumber || '',
      contactPerson: store.contactPerson || '',
      areaId: store.areaId?.toString() || '',
      marginDiscountPercent: store.marginDiscountPercent != null ? String(store.marginDiscountPercent) : '',
    })
    setShowModal(true)
  }

  const handleDelete = async (store: Store) => {
    if (!confirm(`Are you sure you want to deactivate "${store.name}"?`)) return

    try {
      const res = await fetch(`/api/stores/${store.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchStores()
      }
    } catch {
      console.error('Failed to delete store')
    }
  }

  const handleToggleActive = async (store: Store) => {
    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !store.isActive }),
      })
      if (res.ok) {
        fetchStores()
      }
    } catch {
      console.error('Failed to update store')
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="group flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-gray-50 text-gray-400 hover:bg-green-50 hover:text-green-600 transition-all border border-gray-100"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" aria-hidden />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Stores</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Management Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingStore(null)
              resetForm()
              setShowModal(true)
            }}
            className="group relative flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold transition-all hover:bg-green-700 hover:shadow-lg hover:shadow-green-200 active:scale-95 min-h-[44px]"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" aria-hidden />
            <span>Add Store</span>
          </button>
        </div>
      </header>

      {/* Modern Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 flex flex-wrap gap-8 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Filter by Area</label>
            <div className="relative">
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="w-full pl-4 pr-10 py-3.5 bg-gray-50 border-none rounded-2xl text-gray-700 font-bold focus:ring-2 focus:ring-green-500/20 appearance-none transition-all cursor-pointer"
              >
                <option value="">All Regions</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center h-[54px]">
            <label className="relative inline-flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600 shadow-inner"></div>
              <span className="ms-3 text-sm font-bold text-gray-500 group-hover:text-gray-700 transition-colors">Show inactive</span>
            </label>
          </div>

          <div className="ml-auto text-right">
            <div className="bg-green-50 px-4 py-2 rounded-xl inline-block border border-green-100">
              <span className="text-sm font-black text-green-700 tabular-nums">
                {stores.length}
              </span>
              <span className="text-[10px] font-bold text-green-600/60 uppercase tracking-tighter ml-1.5">Stores Registered</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: List View (Table) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Catalog</p>
          </div>
        ) : stores.length === 0 ? (
          <div className="bg-white rounded-[3rem] border-2 border-dashed border-gray-100 py-32 text-center group">
            <div className="inline-flex bg-gray-50 p-6 rounded-full group-hover:bg-green-50 transition-colors">
              <svg className="w-12 h-12 text-gray-300 group-hover:text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="mt-6 text-xl font-black text-gray-900">No stores found</h3>
            <p className="mt-2 text-gray-500 font-medium">Get started by creating your first sales outlet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-[#f8fafc]/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Store & GST</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hidden sm:table-cell">Area & City</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hidden md:table-cell">Phone & Contact</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {stores.map((store) => (
                    <tr
                      key={store.id}
                      className={`group hover:bg-green-50/30 transition-colors ${!store.isActive ? 'opacity-60 bg-gray-50/50' : ''}`}
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 group-hover:text-green-700 transition-colors">{store.name}</span>
                          {store.gstNumber && (
                            <span className="text-[10px] font-bold text-gray-400 tabular-nums">GST: {store.gstNumber}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap hidden sm:table-cell">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700">{store.area?.name || 'Unassigned'}</span>
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{store.city || '--'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700 tabular-nums">{store.phone || '--'}</span>
                          <span className="text-[10px] font-medium text-gray-400">{store.contactPerson || '--'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {isAdmin ? (
                          <button
                            onClick={() => handleToggleActive(store)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${store.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${store.isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                            {store.isActive ? 'Active' : 'Inactive'}
                          </button>
                        ) : (
                          <span
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${store.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${store.isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                            {store.isActive ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex justify-end items-center gap-2">
                          <IconButton icon={Pencil} label="Edit store" variant="edit" onClick={() => handleEdit(store)} />
                          {isAdmin && (
                            <IconButton icon={Trash2} label="Deactivate store" variant="delete" onClick={() => handleDelete(store)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingStore ? 'Edit Store' : 'Add New Store'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area
                </label>
                <select
                  value={formData.areaId}
                  onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">Select Area</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Number
                </label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Margin discount %
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g. 5"
                  value={formData.marginDiscountPercent}
                  onChange={(e) => setFormData({ ...formData, marginDiscountPercent: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-0.5">Applied when creating invoice from approved order. Same discount used every time for this store.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  {editingStore ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
