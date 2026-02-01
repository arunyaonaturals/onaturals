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
  store: { name: string }
  totalAmount: number
  status: string
}

export function InvoicesClient({ isAdmin }: { isAdmin: boolean }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [approvedOrders, setApprovedOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [selectedOrder, setSelectedOrder] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')

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

  const fetchInvoiceDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/invoices/${id}`)
      if (res.ok) setViewInvoice(await res.json())
    } catch {
      console.error('Failed to fetch invoice')
    }
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!selectedOrder) {
      setError('Please select an order')
      return
    }
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selectedOrder, dueDate: dueDate || null }),
      })
      if (res.ok) {
        setShowCreateModal(false)
        setSelectedOrder('')
        setDueDate('')
        fetchInvoices()
        fetchApprovedOrders()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create invoice')
      }
    } catch {
      setError('An error occurred')
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
          {isAdmin && approvedOrders.length > 0 && (
            <button onClick={() => setShowCreateModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
              + Create Invoice
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
          <div className="text-center py-8 text-gray-500">No invoices found.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
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

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create Invoice</h2>
            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Approved Order *</label>
                <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">Choose an order...</option>
                  {approvedOrders.map((order) => (
                    <option key={order.id} value={order.id}>{order.orderNumber} - {order.store.name} ({formatCurrency(order.totalAmount)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">Create Invoice</button>
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
