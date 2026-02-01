'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Invoice {
  id: number
  invoiceNumber: string
  store: { id: number; name: string; city: string | null }
  order: { id: number; orderNumber: string }
  subtotal: number
  discountPercent: number | null
  discountAmount: number
  gstAmount: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: string
  dueDate: string | null
  createdAt: string
  _count?: { payments: number }
  items?: Array<{
    id: number
    product: { name: string }
    quantity: number
    price: number
    gstPercent: number
    gstAmount: number
    total: number
  }>
}

interface Order {
  id: number
  orderNumber: string
  store: { name: string; marginDiscountPercent: number | null }
  totalAmount: number
  status: string
  items?: Array<{
    productId: number
    product: { name: string; mrp: number; gstPercent: number }
    quantity: number
    price: number
    total: number
  }>
}

export function InvoicesClient({ isAdmin }: { isAdmin: boolean }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [approvedOrders, setApprovedOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [invoiceItems, setInvoiceItems] = useState<Array<{
    productId: number
    name: string
    quantity: number
    mrp: number
    discountPercent: number
    gstPercent: number
  }>>([])
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchInvoices()
    if (isAdmin) fetchApprovedOrders()
  }, [filterStatus, isAdmin])

  const fetchInvoices = async () => {
    try {
      let url = '/api/invoices'
      if (filterStatus) url += `?status=${filterStatus}`
      const res = await fetch(url)
      if (res.ok) setInvoices(await res.json())
    } catch {
      console.error('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  const fetchApprovedOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=approved')
      if (res.ok) setApprovedOrders(await res.json())
    } catch {
      console.error('Failed to fetch orders')
    }
  }

  const fetchOrderForInvoicing = async (orderId: string) => {
    if (!orderId) {
      setSelectedOrder(null)
      setInvoiceItems([])
      return
    }
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.ok) {
        const order: Order = await res.json()
        setSelectedOrder(order)
        // Initialize invoice items with the store's default margin
        const defaultMargin = order.store.marginDiscountPercent ?? 0
        setInvoiceItems(order.items?.map(item => ({
          productId: item.productId,
          name: item.product.name,
          quantity: item.quantity,
          mrp: item.product.mrp,
          discountPercent: defaultMargin,
          gstPercent: item.product.gstPercent
        })) || [])
      }
    } catch {
      console.error('Failed to fetch order details')
    }
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!selectedOrder) {
      setError('Please select an order')
      return
    }
    setIsCreating(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          dueDate: dueDate || null,
          items: invoiceItems
        }),
      })
      if (res.ok) {
        setShowCreateModal(false)
        setSelectedOrder(null)
        setInvoiceItems([])
        setDueDate('')
        fetchInvoices()
        fetchApprovedOrders()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create invoice')
      }
    } catch {
      setError('An error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const updateItemMargin = (productId: number, margin: number) => {
    setInvoiceItems(prev => prev.map(item =>
      item.productId === productId ? { ...item, discountPercent: margin } : item
    ))
  }

  const calculateTotals = () => {
    let subtotal = 0
    let discount = 0
    let gst = 0

    invoiceItems.forEach(item => {
      const rowSubtotal = item.mrp * item.quantity
      const rowDiscount = rowSubtotal * (item.discountPercent / 100)
      const rowGst = (rowSubtotal - rowDiscount) * (item.gstPercent / 100)

      subtotal += rowSubtotal
      discount += rowDiscount
      gst += rowGst
    })

    return { subtotal, discount, gst, total: subtotal - discount + gst }
  }

  const fetchInvoiceDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/invoices/${id}`)
      if (res.ok) setViewInvoice(await res.json())
    } catch {
      console.error('Failed to fetch invoice')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unpaid': return 'bg-red-100 text-red-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'paid': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
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
            <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-4">
              {approvedOrders.length > 0 ? (
                <button onClick={() => setShowCreateModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                  + Create Invoice
                </button>
              ) : (
                <span className="text-sm text-gray-500 italic">No approved orders to invoice</span>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="ml-auto mt-6">
            <span className="text-sm text-gray-500">{invoices.length} invoice(s)</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">🧾</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Invoices are created from **Approved** orders. You can create them from the
              <Link href="/orders" className="text-green-600 hover:underline mx-1">Orders</Link>
              page or by clicking the button above.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</span>
                      <div className="text-xs text-gray-500">Order: {invoice.order.orderNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{invoice.store.name}</div>
                      <div className="text-xs text-gray-500">{invoice.store.city || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{formatCurrency(invoice.paidAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{formatCurrency(invoice.balanceAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>{invoice.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => fetchInvoiceDetails(invoice.id)} className="text-blue-600 hover:text-blue-800 mr-2">View</button>
                      <Link href={`/invoices/${invoice.id}/print`} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800 mr-2">Print</Link>
                      {invoice.status !== 'paid' && (
                        <Link href={`/payments?invoiceId=${invoice.id}`} className="text-green-600 hover:text-green-800">Record Payment</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900">Create Tax Invoice</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold rounded-r-lg">{error}</div>}

            <form onSubmit={handleCreateInvoice} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">1. Select Approved Order</label>
                <select
                  value={selectedOrder?.id || ''}
                  onChange={(e) => fetchOrderForInvoicing(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-xl font-bold text-gray-900 outline-none transition-all"
                >
                  <option value="">Choose an order...</option>
                  {approvedOrders.map((order) => (
                    <option key={order.id} value={order.id}>{order.orderNumber} - {order.store.name} ({formatCurrency(order.totalAmount)})</option>
                  ))}
                </select>
              </div>

              {selectedOrder && invoiceItems.length > 0 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">2. Set Item Margins</label>
                    <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Product</th>
                            <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider w-20">Qty</th>
                            <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider w-24">Margin %</th>
                            <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                          {invoiceItems.map((item) => (
                            <tr key={item.productId} className="hover:bg-gray-50/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="text-sm font-bold text-gray-800">{item.name}</div>
                                <div className="text-[10px] font-medium text-gray-400">MRP: {formatCurrency(item.mrp)}</div>
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-black text-gray-700">{item.quantity}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={item.discountPercent}
                                  onChange={(e) => updateItemMargin(item.productId, parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-center font-black text-green-600 focus:border-green-500 outline-none transition-all"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="text-sm font-black text-gray-900">
                                  {formatCurrency((item.mrp * (1 - item.discountPercent / 100)) * item.quantity)}
                                </div>
                                <div className="text-[10px] text-gray-400 line-through">
                                  {formatCurrency(item.mrp * item.quantity)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-[#f8fafc]/50">
                          {calculateTotals().subtotal > 0 && (
                            <>
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-[10px] font-black text-gray-400 text-right uppercase tracking-widest">Subtotal (MRP)</td>
                                <td className="px-4 py-2 text-sm font-bold text-gray-500 text-right">{formatCurrency(calculateTotals().subtotal)}</td>
                              </tr>
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-[10px] font-black text-green-600 text-right uppercase tracking-widest">Margin Discount</td>
                                <td className="px-4 py-2 text-sm font-black text-green-600 text-right">-{formatCurrency(calculateTotals().discount)}</td>
                              </tr>
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-[10px] font-black text-gray-400 text-right uppercase tracking-widest">GST Amount</td>
                                <td className="px-4 py-2 text-sm font-bold text-gray-500 text-right">{formatCurrency(calculateTotals().gst)}</td>
                              </tr>
                              <tr className="border-t border-gray-100">
                                <td colSpan={3} className="px-4 py-4 text-xs font-black text-gray-900 text-right uppercase tracking-widest">Grand Total</td>
                                <td className="px-4 py-4 text-xl font-black text-green-700 text-right">{formatCurrency(calculateTotals().total)}</td>
                              </tr>
                            </>
                          )}
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">3. Additional Details</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Due Date</label>
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-xl font-bold text-gray-900 outline-none transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95">Cancel</button>
                <button
                  type="submit"
                  disabled={!selectedOrder || isCreating}
                  className={`flex-[2] px-6 py-4 text-white rounded-2xl font-black transition-all active:scale-95 shadow-xl ${!selectedOrder || isCreating ? 'bg-gray-300 shadow-none' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}
                >
                  {isCreating ? 'Processing...' : 'Generate Tax Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{viewInvoice.invoiceNumber}</h2>
                <p className="text-sm text-gray-500">{viewInvoice.store.name}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(viewInvoice.status)}`}>{viewInvoice.status}</span>
            </div>

            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">GST</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {viewInvoice.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm">{item.product.name}</td>
                      <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-2 text-sm text-right">{item.gstPercent}%</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-sm text-right">Subtotal:</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(viewInvoice.subtotal)}</td>
                  </tr>
                  {(viewInvoice.discountAmount ?? 0) > 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-sm text-right">
                        Margin discount ({viewInvoice.discountPercent ?? 0}%):
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-green-600">-{formatCurrency(viewInvoice.discountAmount)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-sm text-right">GST:</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(viewInvoice.gstAmount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-sm font-bold text-right">Total:</td>
                    <td className="px-4 py-2 text-sm font-bold text-right">{formatCurrency(viewInvoice.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="text-gray-500">Paid:</span> <span className="text-green-600 font-medium">{formatCurrency(viewInvoice.paidAmount)}</span></div>
              <div><span className="text-gray-500">Balance:</span> <span className="text-red-600 font-medium">{formatCurrency(viewInvoice.balanceAmount)}</span></div>
            </div>

            <div className="flex justify-end gap-2">
              <a href={`/invoices/${viewInvoice.id}/print`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center">Print Tax Invoice</a>
              <button onClick={() => setViewInvoice(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
