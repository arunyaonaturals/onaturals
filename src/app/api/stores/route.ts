import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET all stores
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const areaId = searchParams.get('areaId')
    const isActive = searchParams.get('isActive')

    const where: {
      areaId?: number
      isActive?: boolean
    } = {}

    if (areaId) where.areaId = parseInt(areaId)
    if (isActive !== null) where.isActive = isActive === 'true'

    const stores = await db.store.findMany({
      where,
      include: { area: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(stores)
  } catch (error) {
    console.error('Error fetching stores:', error)
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
  }
}

// POST create store
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, city, state, pincode, phone, email, gstNumber, contactPerson, areaId, marginDiscountPercent } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const store = await db.store.create({
      data: {
        name,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        phone: phone || null,
        email: email || null,
        gstNumber: gstNumber || null,
        contactPerson: contactPerson || null,
        areaId: areaId ? parseInt(areaId) : null,
        marginDiscountPercent: marginDiscountPercent != null ? parseFloat(marginDiscountPercent) : null,
      },
      include: { area: true },
    })

    return NextResponse.json(store, { status: 201 })
  } catch (error) {
    console.error('Error creating store:', error)
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 })
  }
}
