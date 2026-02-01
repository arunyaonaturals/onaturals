'use client'

import { useState } from 'react'
import Link from 'next/link'

export function SettingsClient({ userId }: { userId: string }) {
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [resetInput, setResetInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    const handleMasterReset = async () => {
        if (resetInput !== 'RESET') return

        setLoading(true)
        setStatus(null)
        try {
            const res = await fetch('/api/admin/master-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmation: 'RESET' }),
            })

            const data = await res.json()
            if (res.ok) {
                setStatus({ type: 'success', message: data.message })
                setShowConfirmModal(false)
                setResetInput('')
            } else {
                setStatus({ type: 'error', message: data.error || 'Reset failed.' })
            }
        } catch {
            setStatus({ type: 'error', message: 'An error occurred during reset.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
                    <Link href="/" className="text-green-600 hover:text-green-700 font-bold">← Back</Link>
                    <h1 className="text-2xl font-black text-gray-800">Admin Settings</h1>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50">
                        <h2 className="text-lg font-black text-gray-800">System Maintenance</h2>
                        <p className="text-sm text-gray-500 font-medium italic">Advanced administration tools</p>
                    </div>

                    <div className="p-6 space-y-8">
                        {status && (
                            <div className={`p-4 rounded-xl font-bold flex gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                <span>{status.type === 'success' ? '✅' : '❌'}</span>
                                <p>{status.message}</p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border-2 border-red-50 bg-red-50/10">
                            <div className="space-y-1">
                                <h3 className="font-black text-red-800 text-lg uppercase tracking-tight">Master Reset</h3>
                                <p className="text-sm text-red-600/70 font-bold leading-snug max-w-md">
                                    Irreversibly delete all Orders, Invoices, Payments, and Production records.
                                    <span className="block mt-1 font-black">Warning: Transactions cannot be recovered. Products and Stores will be kept.</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowConfirmModal(true)}
                                className="bg-red-600 text-white font-black px-8 py-4 rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-200 active:scale-95 text-sm uppercase tracking-widest"
                            >
                                Clear All Data
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-2">
                                ⚠️
                            </div>
                            <h2 className="text-2xl font-black text-gray-900">Final Confirmation</h2>
                            <div className="bg-red-50 rounded-2xl p-4 text-xs font-bold text-red-800 leading-relaxed italic">
                                You are about to wipe the entire transaction history. This action is irreversible and usually performed only before going live.
                            </div>

                            <div className="space-y-2 text-left pt-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Type "RESET" to confirm</label>
                                <input
                                    type="text"
                                    value={resetInput}
                                    onChange={(e) => setResetInput(e.target.value)}
                                    placeholder="RESET"
                                    className="w-full px-4 py-4 border-2 border-gray-100 rounded-2xl focus:border-red-500 focus:ring-0 outline-none text-center font-black tracking-widest text-lg transition-colors bg-gray-50"
                                />
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <button
                                    onClick={handleMasterReset}
                                    disabled={loading || resetInput !== 'RESET'}
                                    className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-xl ${resetInput === 'RESET'
                                            ? 'bg-red-600 hover:bg-red-700 shadow-red-200 active:scale-[0.98]'
                                            : 'bg-gray-200 cursor-not-allowed text-gray-400'
                                        }`}
                                >
                                    {loading ? 'Performing Reset...' : 'CONFIRM WIPE'}
                                </button>
                                <button
                                    onClick={() => { setShowConfirmModal(false); setResetInput(''); }}
                                    disabled={loading}
                                    className="w-full py-3 rounded-2xl font-black text-gray-500 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
