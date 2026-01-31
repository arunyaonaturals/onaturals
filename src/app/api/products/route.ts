import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET all products
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const isActive = searchParams.get('isActive')

    const where: {
      categoryId?: number
      isActive?: boolean
    } = {}

    if (categoryId) where.categoryId = parseInt(categoryId)
    if (isActive !== null) where.isActive = isActive === 'true'

    const products = await db.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// POST create product (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, sku, categoryId, weight, weightUnit, mrp, gstPercent, hsnCode } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const product = await db.product.create({
      data: {
        name,
        sku: sku || null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        weight: weight ? parseFloat(weight) : null,
        weightUnit: weightUnit || 'g',
        mrp: mrp ? parseFloat(mrp) : 0,
        gstPercent: gstPercent ? parseFloat(gstPercent) : 18,
        hsnCode: hsnCode || null,
      },
      include: { category: true },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
