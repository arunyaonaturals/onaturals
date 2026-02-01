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

        const vendors = await db.vendor.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json(vendors)
    } catch (error) {
        console.error('Error fetching vendors:', error)
        return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, gstNumber, address, phone, email, billingCycleDays } = body

        if (!name || !phone) {
            return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
        }

        const vendor = await db.vendor.create({
            data: {
                name,
                gstNumber,
                address,
                phone,
                email,
                billingCycleDays: billingCycleDays ? parseInt(billingCycleDays) : 0,
            },
        })

        return NextResponse.json(vendor, { status: 201 })
    } catch (error) {
        console.error('Error creating vendor:', error)
        return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 })
    }
}
