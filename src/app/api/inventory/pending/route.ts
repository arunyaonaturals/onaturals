import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch all approved orders that are not yet invoiced
        const pendingOrders = await db.order.findMany({
            where: {
                status: 'approved',
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
            },
        })

        // Accumulate quantities per product
        const productNeeds: Record<number, { id: number; name: string; sku: string | null; quantity: number; currentStock: number }> = {}

        pendingOrders.forEach(order => {
            order.items.forEach(item => {
                if (!productNeeds[item.productId]) {
                    productNeeds[item.productId] = {
                        id: item.productId,
                        name: item.product.name,
                        sku: item.product.sku,
                        quantity: 0,
                        currentStock: (item.product as any).currentStock || 0
                    }
                }
                productNeeds[item.productId].quantity += item.quantity
            })
        })

        return NextResponse.json(Object.values(productNeeds))
    } catch (error) {
        console.error('Error fetching pending products:', error)
        return NextResponse.json({ error: 'Failed to fetch pending product needs' }, { status: 500 })
    }
}
