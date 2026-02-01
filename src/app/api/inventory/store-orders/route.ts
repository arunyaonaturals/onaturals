import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch all approved orders that are not yet invoiced, grouped by store
        const storeOrders = await db.store.findMany({
            where: {
                orders: {
                    some: {
                        status: 'approved'
                    }
                }
            },
            include: {
                orders: {
                    where: {
                        status: 'approved'
                    },
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        })

        return NextResponse.json(storeOrders)
    } catch (error) {
        console.error('Error fetching store-wise orders:', error)
        return NextResponse.json({ error: 'Failed to fetch store-wise orders' }, { status: 500 })
    }
}
