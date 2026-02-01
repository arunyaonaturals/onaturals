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

        const billId = parseInt(id)
        const body = await request.json()
        const { status, billNumber, billDate } = body

        const updatedBill = await db.vendorBill.update({
            where: { id: billId },
            data: {
                status,
                billNumber,
                billDate: billDate ? new Date(billDate) : undefined,
            },
        })

        return NextResponse.json(updatedBill)
    } catch (error) {
        console.error('Error updating vendor bill:', error)
        return NextResponse.json({ error: 'Failed to update vendor bill' }, { status: 500 })
    }
}
