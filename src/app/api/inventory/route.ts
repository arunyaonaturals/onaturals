import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET all raw materials with current stock
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const materials = await db.rawMaterial.findMany({
      where: { isActive: true },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

// POST add raw material
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, unit, currentStock, minStock } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const material = await db.rawMaterial.create({
      data: {
        name,
        unit: unit || 'kg',
        currentStock: currentStock ? parseFloat(currentStock) : 0,
        minStock: minStock ? parseFloat(minStock) : 0,
      },
    })

    // Record initial stock if provided
    if (currentStock && parseFloat(currentStock) > 0) {
      await db.inventory.create({
        data: {
          rawMaterialId: material.id,
          type: 'in',
          quantity: parseFloat(currentStock),
          notes: 'Initial stock',
        },
      })
    }

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('Error creating raw material:', error)
    return NextResponse.json({ error: 'Failed to create raw material' }, { status: 500 })
  }
}

// PUT update stock (stock movement)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rawMaterialId, type, quantity, notes } = body

    if (!rawMaterialId || !type || !quantity) {
      return NextResponse.json({ error: 'Material, type and quantity are required' }, { status: 400 })
    }

    const material = await db.rawMaterial.findUnique({
      where: { id: parseInt(rawMaterialId) },
    })

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    const qty = parseFloat(quantity)
    let newStock = material.currentStock

    if (type === 'in') {
      newStock += qty
    } else if (type === 'out') {
      if (qty > material.currentStock) {
        return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
      }
      newStock -= qty
    } else if (type === 'adjustment') {
      newStock = qty
    }

    // Create movement record
    await db.inventory.create({
      data: {
        rawMaterialId: parseInt(rawMaterialId),
        type,
        quantity: qty,
        notes: notes || null,
      },
    })

    // Update stock
    const updated = await db.rawMaterial.update({
      where: { id: parseInt(rawMaterialId) },
      data: { currentStock: newStock },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating stock:', error)
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 })
  }
}
