import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// DELETE a payment (admin only). Recalculates invoice paid/balance/status.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admin can delete payments' }, { status: 403 })
    }

    const { id } = await params
    const paymentId = parseInt(id)
    if (Number.isNaN(paymentId)) {
      return NextResponse.json({ error: 'Invalid payment id' }, { status: 400 })
    }

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const invoice = payment.invoice
    const newPaidAmount = Math.max(0, invoice.paidAmount - payment.amount)
    const newBalanceAmount = invoice.totalAmount - newPaidAmount
    const newStatus = newBalanceAmount <= 0 ? 'paid' : newPaidAmount <= 0 ? 'unpaid' : 'partial'

    await db.$transaction([
      db.payment.delete({ where: { id: paymentId } }),
      db.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 })
  }
}
