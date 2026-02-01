import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const purchases = await db.purchaseOrder.findMany({
            include: {
                vendor: true,
                items: {
                    include: {
                        rawMaterial: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(purchases)
    } catch (error) {
        console.error('Error fetching purchase orders:', error)
        return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { vendorId, items, notes } = body

        if (!vendorId || !items || items.length === 0) {
            return NextResponse.json({ error: 'Vendor and items are required' }, { status: 400 })
        }

        const orderNumber = `PO-${Date.now()}`

        // Calculate total amount
        const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0)

        const purchase = await db.purchaseOrder.create({
            data: {
                orderNumber,
                vendorId: parseInt(vendorId),
                totalAmount,
                notes,
                items: {
                    create: items.map((item: any) => ({
                        rawMaterialId: parseInt(item.rawMaterialId),
                        quantity: parseFloat(item.quantity),
                        price: parseFloat(item.price),
                        total: item.quantity * item.price,
                    }))
                }
            },
            include: {
                vendor: true,
                items: true
            }
        })

        return NextResponse.json(purchase, { status: 201 })
    } catch (error) {
        console.error('Error creating purchase order:', error)
        return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
    }
}
