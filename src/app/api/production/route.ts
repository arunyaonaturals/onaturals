import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET production suggestions and status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Get existing production records
    const where: { status?: string } = {}
    if (status) where.status = status

    const productions = await db.production.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(productions)
  } catch (error) {
    console.error('Error fetching production:', error)
    return NextResponse.json({ error: 'Failed to fetch production' }, { status: 500 })
  }
}

// POST create production suggestion based on orders
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productName, quantity, notes } = body

    if (!productName || !quantity) {
      return NextResponse.json({ error: 'Product name and quantity are required' }, { status: 400 })
    }

    const production = await db.production.create({
      data: {
        productName,
        quantity: parseInt(quantity),
        notes: notes || null,
      },
    })

    return NextResponse.json(production, { status: 201 })
  } catch (error) {
    console.error('Error creating production:', error)
    return NextResponse.json({ error: 'Failed to create production' }, { status: 500 })
  }
}

// PUT update production status
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, notes } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 })
    }

    const validStatuses = ['suggested', 'in_progress', 'completed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const production = await db.production.update({
      where: { id: parseInt(id) },
      data: {
        status,
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json(production)
  } catch (error) {
    console.error('Error updating production:', error)
    return NextResponse.json({ error: 'Failed to update production' }, { status: 500 })
  }
}
