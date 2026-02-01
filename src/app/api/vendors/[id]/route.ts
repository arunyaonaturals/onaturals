import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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
        const vendorId = parseInt(id)
        const body = await request.json()
        const { name, gstNumber, address, phone, email, billingCycleDays } = body

        const updatedVendor = await db.vendor.update({
            where: { id: vendorId },
            data: {
                name,
                gstNumber,
                address,
                phone,
                email,
                billingCycleDays: billingCycleDays ? parseInt(billingCycleDays) : 0,
            },
        })

        return NextResponse.json(updatedVendor)
    } catch (error) {
        console.error('Error updating vendor:', error)
        return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
    }
}

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
        const vendorId = parseInt(id)

        await db.vendor.update({
            where: { id: vendorId },
            data: { isActive: false },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting vendor:', error)
        return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 })
    }
}
