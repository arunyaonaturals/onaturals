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
        setUnpaidInvoices(data.filter((i: Invoice) => i.status !== 'draft'))
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

  const handleRecordPayment = (invoiceId: number) => {
    setFormData({
      ...formData,
      invoiceId: invoiceId.toString(),
      amount: '',
    })
    setShowModal(true)
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

  const getPaymentStatusStyles = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700'
      case 'partial': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-red-100 text-red-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-green-600 hover:text-green-700 font-bold">← Back</Link>
            <h1 className="text-2xl font-black text-gray-800">Invoiced Bills</h1>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition shadow-sm">
            + Record Payment
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading bills...</p>
          </div>
        ) : unpaidInvoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 font-medium">No invoiced bills found yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {unpaidInvoices.map((inv) => {
              const invPayments = payments.filter(p => p.invoice.id === inv.id)

              return (
                <div key={inv.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Bill Header */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-gray-900">{inv.invoiceNumber}</h3>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${getPaymentStatusStyles(inv.status)}`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 mt-1">{inv.store.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Bill</div>
                      <div className="text-xl font-black text-gray-900">{formatCurrency(inv.totalAmount)}</div>
                    </div>
                  </div>

                  {/* Payment Details Grid */}
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Progress & Actions */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-bold">Paid:</span>
                          <span className="text-green-600 font-black">{formatCurrency(inv.totalAmount - inv.balanceAmount)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-green-500 h-full transition-all duration-500"
                            style={{ width: `${((inv.totalAmount - inv.balanceAmount) / inv.totalAmount) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-bold">Balance:</span>
                          <span className="text-red-600 font-black">{formatCurrency(inv.balanceAmount)}</span>
                        </div>
                      </div>

                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => handleRecordPayment(inv.id)}
                          className="w-full bg-green-600 text-white font-black py-3 rounded-xl hover:bg-green-700 transition shadow-md"
                        >
                          Record Payment
                        </button>
                      )}
                    </div>

                    {/* Transaction History */}
                    <div className="lg:col-span-8">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Payment History</h4>
                      {invPayments.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <p className="text-xs text-gray-400 font-bold italic">No transactions for this bill yet</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-gray-100">
                          <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Receipt #</th>
                                <th className="px-4 py-2 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="px-4 py-2 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Method</th>
                                <th className="px-4 py-2 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                              {invPayments.map((p) => (
                                <tr key={p.id}>
                                  <td className="px-4 py-3 text-xs font-bold text-gray-900">{p.paymentNumber}</td>
                                  <td className="px-4 py-3 text-[10px] text-gray-500">{new Date(p.collectedAt).toLocaleDateString()}</td>
                                  <td className="px-4 py-3">
                                    <span className="text-[10px] font-black text-gray-600 uppercase">{getModeLabel(p.paymentMode)}</span>
                                    {p.reference && <div className="text-[8px] text-gray-300 font-mono">{p.reference}</div>}
                                  </td>
                                  <td className="px-4 py-3 text-right text-xs font-black text-green-600">{formatCurrency(p.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
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
