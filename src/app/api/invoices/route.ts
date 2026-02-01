import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Generate invoice number
function generateInvoiceNumber() {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `INV${year}${month}${day}${random}`
}

// GET all invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: { status?: string } = {}
    if (status) where.status = status

    const invoices = await db.invoice.findMany({
      where,
      include: {
        store: { select: { id: true, name: true, city: true } },
        order: { select: { id: true, orderNumber: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

// POST create invoice from approved order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, dueDate, discountPercent: globalDiscount, items: customItems } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Get the order with store (for margin discount)
    const order = await db.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        items: { include: { product: true } },
        store: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved orders can be invoiced' }, { status: 400 })
    }

    // Update store default margin if provided
    if (globalDiscount !== undefined && globalDiscount !== null) {
      await db.store.update({
        where: { id: order.storeId },
        data: { marginDiscountPercent: parseFloat(globalDiscount) }
      })
    }

    // Check if invoice already exists
    const existingInvoice = await db.invoice.findUnique({
      where: { orderId: parseInt(orderId) },
    })
    if (existingInvoice) {
      return NextResponse.json({ error: 'Invoice already exists for this order' }, { status: 400 })
    }

    // Use default store margin unless item-specific margins are provided
    const defaultMargin = order.store.marginDiscountPercent ?? 0

    // Calculate invoice totals
    let invoiceSubtotal = 0
    let totalGstAmount = 0
    let totalDiscountAmount = 0

    const invoiceItems = order.items.map(item => {
      // Find custom margin for this item if provided
      const customItem = customItems?.find((ci: any) => ci.productId === item.productId)
      const itemDiscountPercent = customItem?.discountPercent ?? defaultMargin

      const lineSubtotal = item.total // This is Qty * MRP
      const lineDiscountAmount = lineSubtotal * (itemDiscountPercent / 100)
      const lineFactorTotal = lineSubtotal - lineDiscountAmount
      const lineGstAmount = (lineFactorTotal * item.product.gstPercent) / 100

      invoiceSubtotal += lineSubtotal
      totalGstAmount += lineGstAmount
      totalDiscountAmount += lineDiscountAmount

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: lineFactorTotal / item.quantity, // Factor price per unit
        discountPercent: itemDiscountPercent,
        discountAmount: lineDiscountAmount,
        gstPercent: item.product.gstPercent,
        gstAmount: lineGstAmount,
        total: lineFactorTotal + lineGstAmount,
      }
    })

    const finalTotalAmount = invoiceSubtotal - totalDiscountAmount + totalGstAmount

    // Create invoice
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        orderId: parseInt(orderId),
        storeId: order.storeId,
        subtotal: invoiceSubtotal,
        discountPercent: defaultMargin, // Log the default margin used
        discountAmount: totalDiscountAmount,
        gstAmount: totalGstAmount,
        totalAmount: finalTotalAmount,
        balanceAmount: finalTotalAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        items: { create: invoiceItems },
      },
      include: {
        store: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
        items: { include: { product: true } },
      },
    })

    // Update order status
    await db.order.update({
      where: { id: parseInt(orderId) },
      data: { status: 'invoiced' },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
