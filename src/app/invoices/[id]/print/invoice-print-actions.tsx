'use client'

import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'

export function InvoicePrintActions() {
  return (
    <div className="mt-8 flex flex-wrap gap-4 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-[44px]"
        aria-label="Print"
      >
        <Printer className="w-4 h-4" aria-hidden />
        <span>Print</span>
      </button>
      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
        aria-label="Back to Invoices"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        <span>Back to Invoices</span>
      </Link>
    </div>
  )
}
