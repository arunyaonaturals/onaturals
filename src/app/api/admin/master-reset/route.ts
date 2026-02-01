import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        // Security Check: Must be admin
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 })
        }

        const { confirmation } = await request.json()
        if (confirmation !== 'RESET') {
            return NextResponse.json({ error: 'Invalid confirmation code.' }, { status: 400 })
        }

        // Perform deletions in transaction
        await db.$transaction([
            // 1. Delete Payments
            db.payment.deleteMany({}),

            // 2. Delete Invoice Items
            db.invoiceItem.deleteMany({}),

            // 3. Delete Invoices
            db.invoice.deleteMany({}),

            // 4. Delete Order Items
            db.orderItem.deleteMany({}),

            // 5. Delete Orders
            db.order.deleteMany({}),

            // 6. Delete Inventory Movements
            db.inventory.deleteMany({}),

            // 7. Reset Raw Material Stock
            db.rawMaterial.updateMany({
                data: { currentStock: 0 }
            }),

            // 8. Delete Purchase & Billing records
            db.purchaseOrderItem.deleteMany({}),
            db.vendorBill.deleteMany({}),
            db.purchaseOrder.deleteMany({}),
        ])

        return NextResponse.json({ message: 'Master reset successful. All transaction data cleared.' })
    } catch (error) {
        console.error('Master Reset Error:', error)
        return NextResponse.json({ error: 'Failed to perform master reset.' }, { status: 500 })
    }
}
