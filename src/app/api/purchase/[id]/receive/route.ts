import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const purchaseId = parseInt(id)

        const purchase = await db.purchaseOrder.findUnique({
            where: { id: purchaseId },
            include: { items: true }
        })

        if (!purchase) {
            return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
        }

        if (purchase.status === 'reached_office') {
            return NextResponse.json({ error: 'Purchase order already received' }, { status: 400 })
        }

        // Update purchase order status
        const updatedPurchase = await db.purchaseOrder.update({
            where: { id: purchaseId },
            data: {
                status: 'reached_office',
                reachedOfficeAt: new Date(),
            }
        })

        // Update raw material inventory
        for (const item of purchase.items) {
            await db.rawMaterial.update({
                where: { id: item.rawMaterialId },
                data: {
                    currentStock: { increment: item.quantity }
                }
            })

            await db.inventory.create({
                data: {
                    rawMaterialId: item.rawMaterialId,
                    type: 'in',
                    quantity: item.quantity,
                    notes: `Received from PO ${purchase.orderNumber}`
                }
            })
        }

        // Create a Vendor Bill automatically
        await db.vendorBill.create({
            data: {
                vendorId: purchase.vendorId,
                purchaseOrderId: purchase.id,
                amount: purchase.totalAmount,
                status: 'pending_dispatch',
            }
        })

        return NextResponse.json(updatedPurchase)
    } catch (error) {
        console.error('Error receiving purchase order:', error)
        return NextResponse.json({ error: 'Failed to receive purchase order' }, { status: 500 })
    }
}
