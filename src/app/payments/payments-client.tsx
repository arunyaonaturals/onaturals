'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Payment {
  id: number
  paymentNumber: string
  invoice: { id: number; invoiceNumber: string; totalAmount: number }
  store: { id: number; name: string }
  collectedBy: { id: number; name: string }
  amount: number
  paymentMode: string
  reference: string | null
  notes: string | null
  collectedAt: string
}

interface Invoice {
  id: number
  invoiceNumber: string
  store: { name: string }
  totalAmount: number
  balanceAmount: number
  status: string
}

export function PaymentsClient({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const searchParams = useSearchParams()
  const preselectedInvoiceId = searchParams.get('invoiceId')

  const [payments, setPayments] = useState<Payment[]>([])
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(!!preselectedInvoiceId)
  const [formData, setFormData] = useState({
    invoiceId: preselectedInvoiceId || '',
    amount: '',
    paymentMode: 'cash',
    reference: '',
    notes: '',
    collectedAt: new Date().toISOString().split('T')[0],
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPayments()
    fetchUnpaidInvoices()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/payments')
      if (res.ok) setPayments(await res.json())
    } catch {
      console.error('Failed to fetch payments')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnpaidInvoices = async () => {
    try {
      const res = await fetch('/api/invoices')
      if (res.ok) {
        const data = await res.json()
        setUnpaidInvoices(data.filter((i: Invoice) => i.status !== 'paid' && i.status !== 'draft'))
      }
    } catch {
      console.error('Failed to fetch invoices')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.invoiceId || !formData.amount) {
      setError('Invoice and amount are required')
      return
    }
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setShowModal(false)
        setFormData({
          invoiceId: '',
          amount: '',
          paymentMode: 'cash',
          reference: '',
          notes: '',
          collectedAt: new Date().toISOString().split('T')[0]
        })
        fetchPayments()
        fetchUnpaidInvoices()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to record payment')
      }
    } catch {
      setError('An error occurred')
    }
  }

  const selectedInvoice = unpaidInvoices.find(i => i.id.toString() === formData.invoiceId)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'cash': return 'Cash'
      case 'upi': return 'UPI'
      case 'bank_transfer': return 'Bank Transfer'
      case 'cheque': return 'Cheque'
      default: return mode
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-green-600 hover:text-green-700">← Back</Link>
            <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
          </div>
          {unpaidInvoices.length > 0 && (
            <button onClick={() => setShowModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
              + Record Payment
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No payments recorded yet.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collected By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.paymentNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{payment.invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{payment.store.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getModeLabel(payment.paymentMode)}
                      {payment.reference && <div className="text-xs text-gray-400">{payment.reference}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{payment.collectedBy.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(payment.collectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice *</label>
                <select value={formData.invoiceId} onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">Select invoice...</option>
                  {unpaidInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber} - {inv.store.name} (Balance: {formatCurrency(inv.balanceAmount)})</option>
                  ))}
                </select>
              </div>
              {selectedInvoice && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>Balance:</span>
                    <span>{formatCurrency(selectedInvoice.balanceAmount)}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Enter amount" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <input type="date" value={formData.collectedAt} onChange={(e) => setFormData({ ...formData, collectedAt: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (UPI ID / Cheque No.)</label>
                <input type="text" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Optional comments..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
