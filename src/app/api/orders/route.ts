import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Generate order number
function generateOrderNumber() {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ORD${year}${month}${day}${random}`
}

// GET all orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: {
      status?: string
      createdById?: number
    } = {}

    if (status) where.status = status
    // Non-admin users only see their own orders
    if (session.user.role !== 'admin') {
      where.createdById = parseInt(session.user.id)
    }

    const orders = await db.order.findMany({
      where,
      include: {
        store: { select: { id: true, name: true, city: true } },
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// POST create order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { storeId, items, notes } = body

    if (!storeId) {
      return NextResponse.json({ error: 'Store is required' }, { status: 400 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
    }

    // Calculate total (quantity = new stock needed)
    let totalAmount = 0
    const orderItems = items.map((item: { productId: number; quantity: number; price: number; availableQuantity?: number | null }) => {
      const itemTotal = item.quantity * item.price
      totalAmount += itemTotal
      return {
        productId: item.productId,
        quantity: item.quantity,
        availableQuantity: item.availableQuantity != null ? item.availableQuantity : undefined,
        price: item.price,
        total: itemTotal,
      }
    })

    const order = await db.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        storeId: parseInt(storeId),
        createdById: parseInt(session.user.id),
        notes: notes || null,
        totalAmount,
        items: { create: orderItems },
      },
      include: {
        store: { select: { id: true, name: true, city: true } },
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
