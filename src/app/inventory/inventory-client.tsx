'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, ClipboardList, Store, Plus, Pencil } from 'lucide-react'

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

interface Product {
  id: number
  name: string
  sku: string | null
  currentStock: number
  minStock: number
}

interface PendingProduct {
  id: number
  name: string
  sku: string | null
  quantity: number
  currentStock: number
}

interface StoreOrder {
  id: number
  name: string
  orders: {
    id: number
    orderNumber: string
    totalAmount: number
    items: {
      id: number
      product: Product
      quantity: number
    }[]
  }[]
}

export function InventoryClient({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<'stock' | 'pending' | 'stores'>('stock')
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([])
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<{ id: number; name: string; type: 'material' | 'product'; currentStock: number; unit: string } | null>(null)

  const [formData, setFormData] = useState({ name: '', unit: 'kg', currentStock: '', minStock: '' })
  const [stockData, setStockData] = useState({ type: 'in', quantity: '', notes: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [invRes, pendingRes, storeRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/inventory/pending'),
        fetch('/api/inventory/store-orders')
      ])

      if (invRes.ok) {
        const data = await invRes.json()
        setMaterials(data.materials || [])
        setProducts(data.products || [])
      }
      if (pendingRes.ok) setPendingProducts(await pendingRes.json())
      if (storeRes.ok) setStoreOrders(await storeRes.json())
    } catch (err) {
      console.error('Failed to fetch data', err)
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
        fetchAllData()
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
    if (!selectedItem) return
    try {
      const payload = selectedItem.type === 'material'
        ? { rawMaterialId: selectedItem.id, ...stockData }
        : { productId: selectedItem.id, ...stockData }

      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setShowStockModal(false)
        setSelectedItem(null)
        setStockData({ type: 'in', quantity: '', notes: '' })
        fetchAllData()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update stock')
      }
    } catch {
      setError('An error occurred')
    }
  }

  const openStockModal = (id: number, name: string, type: 'material' | 'product', currentStock: number, unit: string, opType: string = 'in') => {
    setSelectedItem({ id, name, type, currentStock, unit })
    setStockData({ type: opType, quantity: '', notes: '' })
    setShowStockModal(true)
  }

  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) return 'bg-red-100 text-red-800'
    if (current < min) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center justify-center min-w-[44px] min-h-[44px] text-green-600 hover:text-green-700 font-bold text-lg rounded-xl hover:bg-green-50 transition" aria-label="Back">
              <ArrowLeft className="w-5 h-5" aria-hidden />
            </Link>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Inventory</h1>
          </div>
          {isAdmin && activeTab === 'stock' && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition shadow-sm min-h-[44px]">
              <Plus className="w-5 h-5" aria-hidden />
              <span>Add Material</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 border-b border-gray-100">
            {[
              { id: 'stock', label: 'Current Stock', icon: Package },
              { id: 'pending', label: 'Pending Needs', icon: ClipboardList },
              { id: 'stores', label: 'Store Orders', icon: Store },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-2 text-sm font-black transition-all relative min-h-[44px] ${activeTab === tab.id ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                  {tab.label}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-600 rounded-t-full" />}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-xs">Fetching Data...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'stock' && (
              <div className="space-y-12">
                {/* Products Section */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1 bg-green-500 rounded-full" />
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Finished Goods (Products)</h2>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Info</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Stock</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Min Stock</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                          {products.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <p className="font-black text-gray-900 group-hover:text-green-600 transition-colors">{p.name}</p>
                                <p className="text-[10px] font-mono text-gray-400 uppercase">{p.sku || 'No SKU'}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => openStockModal(p.id, p.name, 'product', p.currentStock, 'pcs', 'adjustment')}
                                  className="flex items-center justify-center gap-1 mx-auto hover:text-green-600 transition-colors"
                                  title="Quick Adjust"
                                >
                                  <span className="text-lg font-black text-gray-900">{p.currentStock}</span>
                                  <Pencil className="w-3 h-3 text-gray-400 group-hover:text-green-500" />
                                </button>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">pcs</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-bold text-gray-500">{p.minStock}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${getStockStatus(p.currentStock, p.minStock)}`}>
                                  {p.currentStock <= 0 ? 'Out of Stock' : p.currentStock < p.minStock ? 'Low Stock' : 'In Stock'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => openStockModal(p.id, p.name, 'product', p.currentStock, 'pcs')}
                                  className="bg-gray-50 text-gray-600 hover:bg-green-600 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all border border-gray-100 hover:border-green-600 uppercase tracking-widest"
                                >
                                  Update
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                {/* Raw Materials Section */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1 bg-blue-500 rounded-full" />
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Raw Materials</h2>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Material Info</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Stock</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Min Stock</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                          {materials.map((m) => (
                            <tr key={m.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <p className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{m.name}</p>
                                <p className="text-[10px] font-mono text-gray-400 uppercase">Category: Raw Material</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => openStockModal(m.id, m.name, 'material', m.currentStock, m.unit, 'adjustment')}
                                  className="flex items-center justify-center gap-1 mx-auto hover:text-blue-600 transition-colors"
                                  title="Quick Adjust"
                                >
                                  <span className="text-lg font-black text-gray-900">{m.currentStock}</span>
                                  <Pencil className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />
                                </button>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{m.unit}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-bold text-gray-500">{m.minStock}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${getStockStatus(m.currentStock, m.minStock)}`}>
                                  {m.currentStock <= 0 ? 'Wiped' : m.currentStock < m.minStock ? 'Warning' : 'Healthy'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => openStockModal(m.id, m.name, 'material', m.currentStock, m.unit)}
                                  className="bg-gray-50 text-gray-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all border border-gray-100 hover:border-blue-600 uppercase tracking-widest"
                                >
                                  Update
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'pending' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto min-w-0">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Cumulative Production Needs</h2>
                  </div>
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">In Stock</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Ordered (Pending)</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Shortfall</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pendingProducts.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-bold italic">No pending orders to plan for</td></tr>
                      ) : (
                        pendingProducts.map((p) => {
                          const shortfall = Math.max(0, p.quantity - p.currentStock)
                          return (
                            <tr key={p.id}>
                              <td className="px-6 py-4">
                                <p className="font-black text-gray-900">{p.name}</p>
                                <p className="text-[10px] text-gray-400">{p.sku}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`font-bold ${p.currentStock < p.quantity ? 'text-red-500' : 'text-green-600'}`}>{p.currentStock}</span>
                              </td>
                              <td className="px-6 py-4 text-center text-gray-600 font-bold">{p.quantity}</td>
                              <td className="px-6 py-4 text-right">
                                {shortfall > 0 ? (
                                  <span className="bg-red-50 text-red-700 px-3 py-1 rounded-lg font-black text-sm">Need {shortfall} units</span>
                                ) : (
                                  <span className="text-green-600 font-black text-sm">✓ Covered</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'stores' && (
              <div className="space-y-8">
                {storeOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
                    <p className="text-gray-500 font-black">All orders have been invoiced and dispatched!</p>
                  </div>
                ) : (
                  storeOrders.map((store) => (
                    <div key={store.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-black text-gray-900 text-lg">{store.name}</h3>
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {store.orders.length} Pending Order{store.orders.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="p-6">
                        <div className="space-y-6">
                          {store.orders.map((order) => (
                            <div key={order.id} className="border border-gray-50 rounded-2xl p-4 bg-gray-50/30">
                              <div className="flex justify-between items-center mb-4">
                                <p className="font-black text-sm text-gray-600">Order: <span className="text-black uppercase tracking-tighter">{order.orderNumber}</span></p>
                                <Link href="/invoices" className="text-green-600 text-xs font-black hover:underline uppercase tracking-widest">Generate Invoice & Dispatch →</Link>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {order.items.map((item) => {
                                  // Find current stock for this product
                                  const pStock = products.find(p => p.id === item.product.id)?.currentStock || 0
                                  return (
                                    <div key={item.id} className="p-3 bg-white rounded-xl border border-gray-100 flex justify-between items-center">
                                      <div className="space-y-0.5">
                                        <p className="font-bold text-xs text-gray-800">{item.product.name}</p>
                                        <p className="text-[10px] text-gray-400">Qty: {item.quantity}</p>
                                      </div>
                                      <div className="text-right">
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${pStock >= item.quantity ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                          {pStock >= item.quantity ? 'Ready' : 'Incomplete'}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Register Raw Material</h2>
            {error && <div className="mb-4 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-2xl border border-red-100">{error}</div>}
            <form onSubmit={handleAddMaterial} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Material Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-bold transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Unit</label>
                  <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-bold transition-all appearance-none">
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Initial Bank</label>
                  <input type="number" step="0.01" value={formData.currentStock} onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-bold transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Warning Threshold (Min Stock)</label>
                <input type="number" step="0.01" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-bold transition-all" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-gray-400 font-black hover:text-gray-600 transition">Discard</button>
                <button type="submit" className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black hover:bg-green-700 transition shadow-lg shadow-green-100">Establish Bank</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Manage Stock</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{selectedItem.name}</p>
              </div>
              <div className="bg-gray-50 px-3 py-1 rounded-lg text-right">
                <p className="text-[8px] font-black text-gray-400 uppercase">Current</p>
                <p className="text-sm font-black text-gray-900">{selectedItem.currentStock} {selectedItem.unit}</p>
              </div>
            </div>

            {error && <div className="mb-4 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-2xl border border-red-100">{error}</div>}

            <form onSubmit={handleStockUpdate} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Operation Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'in', label: 'In (+)', color: 'border-green-500 text-green-600 bg-green-50' },
                    { id: 'out', label: 'Out (-)', color: 'border-red-500 text-red-600 bg-red-50' },
                    { id: 'adjustment', label: 'Set (=)', color: 'border-blue-500 text-blue-600 bg-blue-50' },
                  ].map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setStockData({ ...stockData, type: op.id })}
                      className={`py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${stockData.type === op.id ? op.color : 'border-gray-50 text-gray-400 bg-gray-50 hover:bg-white hover:border-gray-200'
                        }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Volume ({selectedItem.unit}) *</label>
                <input type="number" step="0.01" value={stockData.quantity} onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })} required className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-black text-lg transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Log Memo (Notes)</label>
                <input type="text" value={stockData.notes} onChange={(e) => setStockData({ ...stockData, notes: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-bold transition-all" placeholder="e.g., Supplier Batch #401" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowStockModal(false)} className="flex-1 py-4 text-gray-400 font-black hover:text-gray-600 transition">Cancel</button>
                <button type="submit" className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black hover:bg-black transition shadow-lg">Commit Change</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
