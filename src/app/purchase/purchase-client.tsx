'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Users, ShoppingCart, Receipt, CheckCircle, XCircle, Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'

interface Vendor {
  id: number
  name: string
  gstNumber: string | null
  address: string | null
  phone: string | null
  email: string | null
  billingCycleDays: number
}

interface PurchaseItem {
  id: number
  rawMaterial: { name: string; unit: string }
  quantity: number
  price: number
  total: number
}

interface PurchaseOrder {
  id: number
  orderNumber: string
  vendor: Vendor
  status: 'pending' | 'reached_office' | 'cancelled'
  totalAmount: number
  reachedOfficeAt: string | null
  createdAt: string
  items: PurchaseItem[]
}

interface VendorBill {
  id: number
  billNumber: string | null
  vendor: Vendor
  purchaseOrder: { orderNumber: string }
  amount: number
  status: 'pending_dispatch' | 'sent_to_vendor' | 'paid'
  createdAt: string
}

export function PurchaseClient({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<'vendors' | 'purchase' | 'billing'>('vendors')
  const [loading, setLoading] = useState(true)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([])
  const [bills, setBills] = useState<VendorBill[]>([])

  // Modals
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [vendorForm, setVendorForm] = useState({
    name: '',
    gstNumber: '',
    address: '',
    phone: '',
    email: '',
    billingCycleDays: '0'
  })

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      const endpoint = activeTab === 'vendors' ? '/api/vendors' : activeTab === 'purchase' ? '/api/purchase' : '/api/vendor-bills'
      const res = await fetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        if (activeTab === 'vendors') setVendors(data)
        else if (activeTab === 'purchase') setPurchases(data)
        else setBills(data)
      }
    } catch (err) {
      console.error('Failed to fetch data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingVendor ? `/api/vendors/${editingVendor.id}` : '/api/vendors'
      const method = editingVendor ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorForm)
      })
      if (res.ok) {
        alert('Vendor saved successfully!')
        setShowVendorModal(false)
        setEditingVendor(null)
        setVendorForm({ name: '', gstNumber: '', address: '', phone: '', email: '', billingCycleDays: '0' })
        fetchData()
      } else {
        const errorData = await res.json()
        alert(`Error: ${errorData.error || 'Failed to save vendor'}`)
      }
    } catch (err) {
      console.error('Error saving vendor', err)
      alert('An unexpected error occurred while saving vendor')
    }
  }

  const togglePurchaseReached = async (id: number) => {
    try {
      const res = await fetch(`/api/purchase/${id}/receive`, { method: 'PUT' })
      if (res.ok) fetchData()
    } catch (err) {
      console.error('Error updating purchase status', err)
    }
  }

  const updateBillStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/vendor-bills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error('Error updating bill status', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center justify-center min-w-[44px] min-h-[44px] text-green-600 hover:text-green-700 font-bold text-lg rounded-xl hover:bg-green-50 transition" aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Purchase Management</h1>
          </div>
          {isAdmin && activeTab === 'vendors' && (
            <button onClick={() => setShowVendorModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition shadow-sm">
              <Plus className="w-5 h-5" />
              <span>Add Vendor</span>
            </button>
          )}
          {isAdmin && activeTab === 'purchase' && (
            <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition shadow-sm">
              <Plus className="w-5 h-5" />
              <span>New Purchase</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 border-b border-gray-100">
            {[
              { id: 'vendors', label: 'Vendors', icon: Users },
              { id: 'purchase', label: 'Raw Material Purchase', icon: ShoppingCart },
              { id: 'billing', label: 'Vendor Billing', icon: Receipt },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-2 text-sm font-black transition-all relative min-h-[44px] ${activeTab === tab.id ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Icon className="w-5 h-5" />
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
            <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-xs">Loading {activeTab}...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'vendors' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendor Info</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Billing Cycle</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {vendors.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic font-bold">No vendors found.</td></tr>
                    ) : vendors.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-black text-gray-900 group-hover:text-green-600 transition-colors">{v.name}</p>
                          <p className="text-[10px] font-mono text-gray-400 uppercase">{v.gstNumber || 'No GST'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-700">{v.phone || '-'}</p>
                          <p className="text-[10px] text-gray-400">{v.email || '-'}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-black text-xs">{v.billingCycleDays} Days</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <IconButton icon={Pencil} label="Edit" variant="edit" onClick={() => {
                              setEditingVendor(v)
                              setVendorForm({
                                name: v.name,
                                gstNumber: v.gstNumber || '',
                                address: v.address || '',
                                phone: v.phone || '',
                                email: v.email || '',
                                billingCycleDays: v.billingCycleDays.toString()
                              })
                              setShowVendorModal(true)
                            }} />
                            <IconButton icon={Trash2} label="Delete" variant="delete" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'purchase' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order #</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendor</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Office Status</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {purchases.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic font-bold">No purchase orders found.</td></tr>
                    ) : purchases.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-black text-gray-900">{p.orderNumber}</p>
                          <p className="text-[10px] text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-700">{p.vendor.name}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="font-black text-gray-900">₹{p.totalAmount}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${p.status === 'reached_office' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {p.status === 'reached_office' ? 'Reached' : 'In Transit'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {p.status !== 'reached_office' && (
                            <button
                              onClick={() => togglePurchaseReached(p.id)}
                              className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all hover:bg-green-700 uppercase tracking-widest"
                            >
                              Mark as Reached
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Bill Info</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendor</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Tracking Status</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bills.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic font-bold">No bills found.</td></tr>
                    ) : bills.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-black text-gray-900">{b.billNumber || 'TBD'}</p>
                          <p className="text-[10px] text-gray-400">Order: {b.purchaseOrder.orderNumber}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-700">{b.vendor.name}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="font-black text-gray-900">₹{b.amount}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${b.status === 'paid' ? 'bg-green-100 text-green-700' :
                            b.status === 'sent_to_vendor' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                            {b.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {b.status === 'pending_dispatch' && (
                            <button
                              onClick={() => updateBillStatus(b.id, 'sent_to_vendor')}
                              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all hover:bg-blue-700 uppercase tracking-widest"
                            >
                              Mark as Sent
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-gray-900 mb-6">{editingVendor ? 'Edit Vendor' : 'New Vendor'}</h2>
            <form onSubmit={handleVendorSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Vendor Name *</label>
                <input type="text" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} required className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-bold transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">GST Number</label>
                  <input type="text" value={vendorForm.gstNumber} onChange={e => setVendorForm({ ...vendorForm, gstNumber: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-bold transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Billing Days</label>
                  <input type="number" value={vendorForm.billingCycleDays} onChange={e => setVendorForm({ ...vendorForm, billingCycleDays: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-bold transition-all" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Phone *</label>
                <input type="text" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} required className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-bold transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Email</label>
                <input type="email" value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-bold transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Address</label>
                <textarea value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none font-bold transition-all" rows={2} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowVendorModal(false); setEditingVendor(null); }} className="flex-1 py-4 text-gray-400 font-black hover:text-gray-600 transition">Discard</button>
                <button type="submit" className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black hover:bg-green-700 transition shadow-lg shadow-green-100">Save Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
