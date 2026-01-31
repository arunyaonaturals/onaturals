import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET all areas
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const areas = await db.area.findMany({
      include: {
        salesCaptain: { select: { id: true, name: true, email: true } },
        _count: { select: { stores: true } }
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(areas)
  } catch (error) {
    console.error('Error fetching areas:', error)
    return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 })
  }
}

// POST create area (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, salesCaptainId } = await request.json()
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const area = await db.area.create({
      data: {
        name,
        salesCaptainId: salesCaptainId ? parseInt(salesCaptainId) : null,
      },
      include: {
        salesCaptain: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(area, { status: 201 })
  } catch (error) {
    console.error('Error creating area:', error)
    return NextResponse.json({ error: 'Failed to create area' }, { status: 500 })
  }
}
