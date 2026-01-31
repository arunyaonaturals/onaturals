import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Generate payment number
function generatePaymentNumber() {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `PAY${year}${month}${day}${random}`
}

// GET all payments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')

    const where: { invoiceId?: number; collectedById?: number } = {}
    if (invoiceId) where.invoiceId = parseInt(invoiceId)
    // Non-admin users only see their own payments
    if (session.user.role !== 'admin') {
      where.collectedById = parseInt(session.user.id)
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
        store: { select: { id: true, name: true } },
        collectedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

// POST record payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invoiceId, amount, paymentMode, reference, notes } = body

    if (!invoiceId || !amount) {
      return NextResponse.json({ error: 'Invoice and amount are required' }, { status: 400 })
    }

    // Get the invoice
    const invoice = await db.invoice.findUnique({
      where: { id: parseInt(invoiceId) },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const paymentAmount = parseFloat(amount)
    if (paymentAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
    }

    if (paymentAmount > invoice.balanceAmount) {
      return NextResponse.json({ 
        error: `Amount exceeds balance (${invoice.balanceAmount})` 
      }, { status: 400 })
    }

    // Create payment
    const payment = await db.payment.create({
      data: {
        paymentNumber: generatePaymentNumber(),
        invoiceId: parseInt(invoiceId),
        storeId: invoice.storeId,
        collectedById: parseInt(session.user.id),
        amount: paymentAmount,
        paymentMode: paymentMode || 'cash',
        reference: reference || null,
        notes: notes || null,
      },
      include: {
        invoice: { select: { id: true, invoiceNumber: true } },
        store: { select: { id: true, name: true } },
        collectedBy: { select: { id: true, name: true } },
      },
    })

    // Update invoice
    const newPaidAmount = invoice.paidAmount + paymentAmount
    const newBalanceAmount = invoice.totalAmount - newPaidAmount
    const newStatus = newBalanceAmount <= 0 ? 'paid' : 'partial'

    await db.invoice.update({
      where: { id: parseInt(invoiceId) },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        status: newStatus,
      },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}
