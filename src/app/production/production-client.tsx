'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Production {
  id: number
  productName: string
  quantity: number
  status: string
  notes: string | null
  createdAt: string
}

export function ProductionClient({ isAdmin }: { isAdmin: boolean }) {
  const [productions, setProductions] = useState<Production[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ productName: '', quantity: '', notes: '' })
  const [error, setError] = useState('')

  useEffect(() => { fetchProductions() }, [filterStatus])

  const fetchProductions = async () => {
    try {
      let url = '/api/production'
      if (filterStatus) url += `?status=${filterStatus}`
      const res = await fetch(url)
      if (res.ok) setProductions(await res.json())
    } catch {
      console.error('Failed to fetch productions')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setShowModal(false)
        setFormData({ productName: '', quantity: '', notes: '' })
        fetchProductions()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create')
      }
    } catch {
      setError('An error occurred')
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/production', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) fetchProductions()
    } catch {
      console.error('Failed to update status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'suggested': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-green-600 hover:text-green-700">← Back</Link>
            <h1 className="text-2xl font-bold text-gray-800">Production</h1>
          </div>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
              + Add Task
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">All Status</option>
              <option value="suggested">Suggested</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="ml-auto mt-6">
            <span className="text-sm text-gray-500">{productions.length} task(s)</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : productions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No production tasks.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productions.map((prod) => (
                  <tr key={prod.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{prod.productName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{prod.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(prod.status)}`}>{prod.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{prod.notes || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(prod.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {prod.status === 'suggested' && (
                        <button onClick={() => handleStatusChange(prod.id, 'in_progress')} className="text-yellow-600 hover:text-yellow-800 mr-2">Start</button>
                      )}
                      {prod.status === 'in_progress' && (
                        <button onClick={() => handleStatusChange(prod.id, 'completed')} className="text-green-600 hover:text-green-800">Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add Production Task</h2>
            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input type="text" value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
