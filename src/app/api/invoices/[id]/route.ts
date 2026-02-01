import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const invoice = await db.invoice.findUnique({
      where: { id: parseInt(id) },
      include: {
        store: true,
        order: { select: { id: true, orderNumber: true, createdBy: { select: { name: true } } } },
        items: { include: { product: true } },
        payments: { include: { collectedBy: { select: { name: true } } } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}
// PUT update invoice (Approve draft)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    const existingInvoice = await db.invoice.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Only allow approving draft invoices
    if (status === 'unpaid' && existingInvoice.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft invoices can be approved' }, { status: 400 })
    }

    const invoice = await db.invoice.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        store: true,
        order: { select: { id: true, orderNumber: true } },
      },
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

// DELETE invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const invoice = await db.invoice.findUnique({
      where: { id: parseInt(id) },
      select: { orderId: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Use a transaction to ensure both deletion and order update succeed
    await db.$transaction([
      db.invoice.delete({ where: { id: parseInt(id) } }),
      db.order.update({
        where: { id: invoice.orderId },
        data: { status: 'approved' },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}
