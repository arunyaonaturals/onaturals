'use client'

import Link from 'next/link'

export function InvoicePrintActions() {
  return (
    <div className="mt-8 flex gap-4 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        Print
      </button>
      <Link href="/invoices" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
        Back to Invoices
      </Link>
    </div>
  )
}
