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

        const bills = await db.vendorBill.findMany({
            include: {
                vendor: true,
                purchaseOrder: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(bills)
    } catch (error) {
        console.error('Error fetching vendor bills:', error)
        return NextResponse.json({ error: 'Failed to fetch vendor bills' }, { status: 500 })
    }
}
