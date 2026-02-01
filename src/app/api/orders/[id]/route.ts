import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET single order
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
    const order = await db.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        store: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

// PUT update order (status changes, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    // Check if order exists
    const existingOrder = await db.order.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only admin can approve orders
    if (status === 'approved' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admin can approve orders' }, { status: 403 })
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['submitted', 'cancelled'],
      submitted: ['approved', 'cancelled'],
      approved: ['invoiced', 'cancelled'],
      invoiced: [],
      cancelled: [],
    }

    if (status && !validTransitions[existingOrder.status]?.includes(status)) {
      return NextResponse.json({
        error: `Cannot change status from ${existingOrder.status} to ${status}`
      }, { status: 400 })
    }

    const order = await db.order.update({
      where: { id: parseInt(id) },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        store: { select: { id: true, name: true, city: true } },
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

// DELETE order (only draft orders can be deleted)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const order = await db.order.findUnique({
      where: { id: parseInt(id) },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only draft, cancelled, submitted, or approved orders can be deleted
    if (order.status !== 'draft' && order.status !== 'cancelled' && order.status !== 'submitted' && order.status !== 'approved') {
      return NextResponse.json({
        error: 'Only draft, cancelled, submitted, or approved orders can be deleted'
      }, { status: 400 })
    }

    // Only admin can delete approved orders
    if (order.status === 'approved' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admin can delete approved orders' }, { status: 403 })
    }

    // For other statuses: only creator or admin can delete
    if (order.status !== 'approved' && order.createdById !== parseInt(session.user.id) && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await db.order.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
