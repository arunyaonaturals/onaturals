'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Movement {
  id: number
  type: string
  quantity: number
  notes: string | null
  createdAt: string
}

interface RawMaterial {
  id: number
  name: string
  unit: string
  currentStock: number
  minStock: number
  movements: Movement[]
}

export function InventoryClient({ isAdmin }: { isAdmin: boolean }) {
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null)
  const [formData, setFormData] = useState({ name: '', unit: 'kg', currentStock: '', minStock: '' })
  const [stockData, setStockData] = useState({ type: 'in', quantity: '', notes: '' })
  const [error, setError] = useState('')

  useEffect(() => { fetchMaterials() }, [])

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/inventory')
      if (res.ok) setMaterials(await res.json())
    } catch {
      console.error('Failed to fetch inventory')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setShowAddModal(false)
        setFormData({ name: '', unit: 'kg', currentStock: '', minStock: '' })
        fetchMaterials()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add material')
      }
    } catch {
      setError('An error occurred')
    }
  }

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!selectedMaterial) return
    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawMaterialId: selectedMaterial.id, ...stockData }),
      })
      if (res.ok) {
        setShowStockModal(false)
        setSelectedMaterial(null)
        setStockData({ type: 'in', quantity: '', notes: '' })
        fetchMaterials()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update stock')
      }
    } catch {
      setError('An error occurred')
    }
  }

  const openStockModal = (material: RawMaterial) => {
    setSelectedMaterial(material)
    setStockData({ type: 'in', quantity: '', notes: '' })
    setShowStockModal(true)
  }

  const getStockStatus = (material: RawMaterial) => {
    if (material.currentStock <= 0) return 'bg-red-100 text-red-800'
    if (material.currentStock < material.minStock) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-green-600 hover:text-green-700">← Back</Link>
            <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
          </div>
          {isAdmin && (
            <button onClick={() => setShowAddModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
              + Add Material
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : materials.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No raw materials added yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {materials.map((material) => (
              <div key={material.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{material.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStockStatus(material)}`}>
                      {material.currentStock <= 0 ? 'Out of Stock' : material.currentStock < material.minStock ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>
                  <button onClick={() => openStockModal(material)} className="text-sm text-blue-600 hover:text-blue-800">Update</button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Stock:</span>
                    <span className="font-medium">{material.currentStock} {material.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Min Stock:</span>
                    <span className="text-sm">{material.minStock} {material.unit}</span>
                  </div>
                </div>
                {material.movements.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-2">Recent Activity:</p>
                    {material.movements.slice(0, 3).map((m) => (
                      <div key={m.id} className="text-xs text-gray-600 flex justify-between">
                        <span className={m.type === 'in' ? 'text-green-600' : m.type === 'out' ? 'text-red-600' : 'text-blue-600'}>
                          {m.type === 'in' ? '+' : m.type === 'out' ? '-' : '='}{m.quantity}
                        </span>
                        <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add Raw Material</h2>
            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="l">Liters (l)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
                  <input type="number" step="0.01" value={formData.currentStock} onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock Level</label>
                <input type="number" step="0.01" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">Add Material</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2">Update Stock</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedMaterial.name} (Current: {selectedMaterial.currentStock} {selectedMaterial.unit})</p>
            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
            <form onSubmit={handleStockUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={stockData.type} onChange={(e) => setStockData({ ...stockData, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="in">Stock In (+)</option>
                  <option value="out">Stock Out (-)</option>
                  <option value="adjustment">Adjustment (=)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity ({selectedMaterial.unit}) *</label>
                <input type="number" step="0.01" value={stockData.quantity} onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input type="text" value={stockData.notes} onChange={(e) => setStockData({ ...stockData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g., Received from supplier" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowStockModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
