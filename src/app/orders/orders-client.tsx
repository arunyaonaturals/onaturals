'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Store {
  id: number
  name: string
  city: string | null
}

interface Product {
  id: number
  name: string
  mrp: number
  weight: number | null
  weightUnit: string | null
}

interface OrderItem {
  id: number
  productId: number
  product: Product
  quantity: number
  price: number
  total: number
}

interface Order {
  id: number
  orderNumber: string
  storeId: number
  store: Store
  createdBy: { id: number; name: string }
  status: string
  notes: string | null
  totalAmount: number
  createdAt: string
  items: OrderItem[]
}

export function OrdersClient({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  
  // New order form state
  const [selectedStore, setSelectedStore] = useState('')
  const [orderItems, setOrderItems] = useState<{ productId: number; quantity: number; price: number }[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOrders()
    fetchStores()
    fetchProducts()
  }, [filterStatus])

  const fetchOrders = async () => {
    try {
      let url = '/api/orders'
      if (filterStatus) url += `?status=${filterStatus}`
      
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch {
      console.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores?isActive=true')
      if (res.ok) {
        const data = await res.json()
        setStores(data)
      }
    } catch {
      console.error('Failed to fetch stores')
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?isActive=true')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch {
      console.error('Failed to fetch products')
    }
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const itemsWithQuantity = orderItems.filter(i => i.quantity > 0)
    if (!selectedStore) {
      setError('Please select a store')
      return
    }
    if (itemsWithQuantity.length === 0) {
      setError('Please add at least one item')
      return
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStore,
          items: itemsWithQuantity,
          notes,
        }),
      })

      if (res.ok) {
        setShowModal(false)
        resetForm()
        fetchOrders()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create order')
      }
    } catch {
      setError('An error occurred')
    }
  }

  const resetForm = () => {
    setSelectedStore('')
    setOrderItems([])
    setNotes('')
  }

  const openNewOrderModal = () => {
    resetForm()
    // Initialize order items with all products
    setOrderItems(products.map(p => ({ productId: p.id, quantity: 0, price: p.mrp })))
    setShowModal(true)
  }

  const updateQuantity = (productId: number, quantity: number) => {
    setOrderItems(items =>
      items.map(item =>
        item.productId === productId ? { ...item, quantity: Math.max(0, quantity) } : item
      )
    )
  }

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchOrders()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update status')
      }
    } catch {
      console.error('Failed to update status')
    }
  }

  const handleDelete = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete this order?')) return

    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchOrders()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete order')
      }
    } catch {
      console.error('Failed to delete order')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'submitted': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'invoiced': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-green-600 hover:text-green-700">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
          </div>
          <button
            onClick={openNewOrderModal}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            + New Order
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="invoiced">Invoiced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="ml-auto mt-6">
            <span className="text-sm text-gray-500">
              {orders.length} order(s)
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No orders found. Click &quot;+ New Order&quot; to create one.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{order.store.name}</div>
                      <div className="text-xs text-gray-500">{order.store.city || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.items.length} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setViewOrder(order)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                      >
                        View
                      </button>
                      {order.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(order.id, 'submitted')}
                            className="text-green-600 hover:text-green-800 mr-2"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {order.status === 'submitted' && isAdmin && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'approved')}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* New Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">New Order</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrder}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Store *
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">Choose a store...</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} {store.city ? `- ${store.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Products</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">MRP</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 w-32">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {products.map((product) => {
                        const item = orderItems.find(i => i.productId === product.id)
                        const qty = item?.quantity || 0
                        const total = qty * product.mrp
                        return (
                          <tr key={product.id} className={qty > 0 ? 'bg-green-50' : ''}>
                            <td className="px-4 py-2 text-sm">
                              {product.name}
                              {product.weight && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({product.weight} {product.weightUnit?.toUpperCase()})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-right">
                              {formatCurrency(product.mrp)}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                value={qty}
                                onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-medium">
                              {qty > 0 ? formatCurrency(total) : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm font-medium text-right">
                          Total:
                        </td>
                        <td className="px-4 py-2 text-sm font-bold text-right">
                          {formatCurrency(calculateTotal())}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3">
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
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{viewOrder.orderNumber}</h2>
                <p className="text-sm text-gray-500">{viewOrder.store.name}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(viewOrder.status)}`}>
                {viewOrder.status}
              </span>
            </div>

            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {viewOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm">{item.product.name}</td>
                      <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-right">Total:</td>
                    <td className="px-4 py-2 text-sm font-bold text-right">
                      {formatCurrency(viewOrder.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {viewOrder.notes && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700">Notes</h3>
                <p className="text-sm text-gray-600 mt-1">{viewOrder.notes}</p>
              </div>
            )}

            <div className="text-sm text-gray-500 mb-4">
              Created by {viewOrder.createdBy.name} on {formatDate(viewOrder.createdAt)}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setViewOrder(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
