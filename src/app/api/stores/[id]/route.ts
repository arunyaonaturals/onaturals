import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET single store
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const store = await db.store.findUnique({
      where: { id: parseInt(id) },
      include: { area: true },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    return NextResponse.json(store)
  } catch (error) {
    console.error('Error fetching store:', error)
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
  }
}

// PUT update store
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, address, city, state, pincode, phone, email, gstNumber, contactPerson, areaId, isActive, marginDiscountPercent } = body

    const store = await db.store.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address: address || null }),
        ...(city !== undefined && { city: city || null }),
        ...(state !== undefined && { state: state || null }),
        ...(pincode !== undefined && { pincode: pincode || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(gstNumber !== undefined && { gstNumber: gstNumber || null }),
        ...(contactPerson !== undefined && { contactPerson: contactPerson || null }),
        ...(areaId !== undefined && { areaId: areaId ? parseInt(areaId) : null }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(marginDiscountPercent !== undefined && { marginDiscountPercent: marginDiscountPercent === '' || marginDiscountPercent == null ? null : parseFloat(marginDiscountPercent) }),
      },
      include: { area: true },
    })

    return NextResponse.json(store)
  } catch (error) {
    console.error('Error updating store:', error)
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
  }
}

// DELETE store - soft delete
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
    await db.store.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting store:', error)
    return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 })
  }
}
