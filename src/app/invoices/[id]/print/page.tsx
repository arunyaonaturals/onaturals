import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { INVOICE_COMPANY, INVOICE_BANK } from '@/lib/invoice-company'
import { InvoicePrintActions } from './invoice-print-actions'

function amountInWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const round = Math.round(n)
  if (round === 0) return 'Zero Only'
  if (round > 999999) return `INR ${round.toLocaleString('en-IN')} Only`
  function toWords(num: number): string {
    if (num === 0) return ''
    if (num < 10) return ones[num]
    if (num < 20) return teens[num - 10]
    if (num < 100) return (tens[Math.floor(num / 10)] + ' ' + ones[num % 10]).trim()
    if (num < 1000) return (ones[Math.floor(num / 100)] + ' Hundred ' + toWords(num % 100)).trim()
    if (num < 100000) return (toWords(Math.floor(num / 1000)) + ' Thousand ' + toWords(num % 1000)).trim()
    return (toWords(Math.floor(num / 100000)) + ' Lakh ' + toWords(num % 100000)).trim()
  }
  return `INR ${toWords(round)} Only`
}

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const { id } = await params
  const invoice = await db.invoice.findUnique({
    where: { id: parseInt(id) },
    include: {
      store: true,
      order: { select: { orderNumber: true } },
      items: { include: { product: true } },
    },
  })

  if (!invoice) notFound()

  const discountPercent = invoice.discountPercent ?? 0
  const taxableSubtotal = invoice.subtotal - (invoice.discountAmount ?? 0)
  const cgstAmount = Math.round((invoice.gstAmount / 2) * 100) / 100
  const sgstAmount = invoice.gstAmount - cgstAmount
  const totalRounded = Math.round(invoice.totalAmount)
  const roundOff = Math.round((totalRounded - invoice.totalAmount) * 100) / 100

  const hsnMap = new Map<string, { taxable: number; cgst: number; sgst: number; rate: number }>()
  for (const item of invoice.items) {
    const hsn = item.product.hsnCode || 'N/A'
    const taxable = item.total - item.gstAmount
    const cgst = item.gstAmount / 2
    const sgst = item.gstAmount - cgst
    const existing = hsnMap.get(hsn)
    if (existing) {
      existing.taxable += taxable
      existing.cgst += cgst
      existing.sgst += sgst
    } else {
      hsnMap.set(hsn, { taxable, cgst, sgst, rate: item.product.gstPercent })
    }
  }

  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

  return (
    <div className="min-h-screen bg-white p-6 text-sm print:p-4 print:text-xs">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold uppercase">Tax Invoice</h1>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 border-b border-black pb-4">
          <div>
            <p className="font-semibold uppercase">{INVOICE_COMPANY.name}</p>
            <p>{INVOICE_COMPANY.address}</p>
            <p>Phone: {INVOICE_COMPANY.phone}</p>
            <p>GSTIN/UIN: {INVOICE_COMPANY.gstin}</p>
            <p>State Name: {INVOICE_COMPANY.stateName}, Code: {INVOICE_COMPANY.stateCode}</p>
            <p>E-Mail: {INVOICE_COMPANY.email}</p>
          </div>
          <div>
            <p><strong>Invoice No.:</strong> {invoice.invoiceNumber}</p>
            <p><strong>Dated:</strong> {invoiceDate}</p>
            <p><strong>Delivery Note</strong></p>
            <p><strong>Mode/Terms of Payment</strong></p>
            <p><strong>Reference No. &amp; Date</strong></p>
            <p><strong>Buyer&apos;s Order No.:</strong> {invoice.order?.orderNumber ?? ''}</p>
            <p><strong>Dispatch Doc No.</strong></p>
            <p><strong>Delivery Note Date</strong></p>
            <p><strong>Dispatched through</strong></p>
            <p><strong>Destination</strong></p>
            <p><strong>Terms of Delivery</strong></p>
          </div>
        </div>

        <div className="border border-black p-3 mb-4">
          <p className="font-semibold mb-1">Bill to:</p>
          <p className="font-semibold">{invoice.store.name}</p>
          <p>{invoice.store.address || '-'}</p>
          <p>{invoice.store.city && invoice.store.state ? `${invoice.store.city}, ${invoice.store.state}` : invoice.store.city || invoice.store.state || ''}</p>
          <p>Phone: {invoice.store.phone || '-'}</p>
          <p>GSTIN/UIN: {invoice.store.gstNumber || '-'}</p>
          <p>State Name: {invoice.store.state || '-'}, Code: {invoice.store.state ? '33' : ''}</p>
        </div>

        <table className="w-full border border-black border-collapse mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1 text-left">Sl No.</th>
              <th className="border border-black px-2 py-1 text-left">Description of Goods</th>
              <th className="border border-black px-2 py-1 text-center">HSN/SAC</th>
              <th className="border border-black px-2 py-1 text-center">GST Rate</th>
              <th className="border border-black px-2 py-1 text-right">MRP/Marginal</th>
              <th className="border border-black px-2 py-1 text-center">Qty Shipped</th>
              <th className="border border-black px-2 py-1 text-center">Qty Billed</th>
              <th className="border border-black px-2 py-1 text-right">Rate</th>
              <th className="border border-black px-2 py-1 text-center">per</th>
              <th className="border border-black px-2 py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => {
              const mrp = discountPercent > 0 ? item.price / (1 - discountPercent / 100) : item.price
              const lineAmount = item.total - item.gstAmount
              return (
                <tr key={item.id}>
                  <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border border-black px-2 py-1">{item.product.name}</td>
                  <td className="border border-black px-2 py-1 text-center">{item.product.hsnCode || '-'}</td>
                  <td className="border border-black px-2 py-1 text-center">{item.product.gstPercent}%</td>
                  <td className="border border-black px-2 py-1 text-right">{mrp.toFixed(2)}/NOS</td>
                  <td className="border border-black px-2 py-1 text-center">{item.quantity} NOS</td>
                  <td className="border border-black px-2 py-1 text-center">{item.quantity} NOS</td>
                  <td className="border border-black px-2 py-1 text-right">{item.price.toFixed(2)}</td>
                  <td className="border border-black px-2 py-1 text-center">NOS</td>
                  <td className="border border-black px-2 py-1 text-right">{lineAmount.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="flex justify-end mb-4">
          <table className="w-64 border border-black border-collapse">
            <tbody>
              <tr><td className="border border-black px-2 py-1 text-right">Sub-total:</td><td className="border border-black px-2 py-1 text-right">{taxableSubtotal.toFixed(2)}</td></tr>
              <tr><td className="border border-black px-2 py-1 text-right">Output CGST:</td><td className="border border-black px-2 py-1 text-right">{cgstAmount.toFixed(2)}</td></tr>
              <tr><td className="border border-black px-2 py-1 text-right">Output SGST:</td><td className="border border-black px-2 py-1 text-right">{sgstAmount.toFixed(2)}</td></tr>
              {Math.abs(roundOff) >= 0.01 && (
                <tr><td className="border border-black px-2 py-1 text-right">Less Round Off:</td><td className="border border-black px-2 py-1 text-right">({roundOff.toFixed(2)})</td></tr>
              )}
              <tr><td className="border border-black px-2 py-1 text-right font-semibold">Total Amount:</td><td className="border border-black px-2 py-1 text-right font-semibold">₹{totalRounded.toLocaleString('en-IN')}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-right mb-6"><strong>Amount Chargeable (in words):</strong> {amountInWords(totalRounded)}</p>

        <table className="w-full border border-black border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1 text-left">HSN/SAC</th>
              <th className="border border-black px-2 py-1 text-right">Taxable Value</th>
              <th className="border border-black px-2 py-1 text-center">CGST (Rate, Amount)</th>
              <th className="border border-black px-2 py-1 text-center">SGST/UTGST (Rate, Amount)</th>
              <th className="border border-black px-2 py-1 text-right">Total Tax Amount</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(hsnMap.entries()).map(([hsn, row]) => (
              <tr key={hsn}>
                <td className="border border-black px-2 py-1">{hsn}</td>
                <td className="border border-black px-2 py-1 text-right">{row.taxable.toFixed(2)}</td>
                <td className="border border-black px-2 py-1 text-center">{row.rate / 2}%, {row.cgst.toFixed(2)}</td>
                <td className="border border-black px-2 py-1 text-center">{row.rate / 2}%, {row.sgst.toFixed(2)}</td>
                <td className="border border-black px-2 py-1 text-right">{(row.cgst + row.sgst).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="border border-black px-2 py-1">Total</td>
              <td className="border border-black px-2 py-1 text-right">{taxableSubtotal.toFixed(2)}</td>
              <td className="border border-black px-2 py-1 text-right">{cgstAmount.toFixed(2)}</td>
              <td className="border border-black px-2 py-1 text-right">{sgstAmount.toFixed(2)}</td>
              <td className="border border-black px-2 py-1 text-right">{invoice.gstAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="text-right mb-6">Tax Amount (in words): {amountInWords(invoice.gstAmount)}</p>

        <div className="border border-black p-3 mb-6">
          <p className="font-semibold">Company&apos;s Bank Details</p>
          <p>A/c Holder&apos;s Name: {INVOICE_BANK.accountHolderName}</p>
          <p>Bank Name: {INVOICE_BANK.bankName}</p>
          <p>A/c No: {INVOICE_BANK.accountNumber}</p>
          <p>Branch &amp; IFS Code: {INVOICE_BANK.branchAndIfsc}</p>
        </div>

        <p className="text-xs mb-2">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
        <p className="text-xs mb-4">Computer Generated Invoice</p>
        <p className="text-xs">Authorised Signatory</p>

        <InvoicePrintActions />
      </div>
    </div>
  )
}
