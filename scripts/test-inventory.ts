import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN,
})
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('--- Testing Inventory Logic ---')

    // 1. Ensure we have at least one product with stock
    const product = await prisma.product.findFirst({ where: { isActive: true } })
    if (!product) {
        console.log('No active products found to test with.')
        return
    }

    await prisma.product.update({
        where: { id: product.id },
        data: { currentStock: 10 }
    })
    console.log(`Updated ${product.name} stock to 10.`)

    // 2. Create an approved order for 15 units (Should show shortfall of 5)
    const store = await prisma.store.findFirst()
    const user = await prisma.user.findFirst()

    if (!store || !user) {
        console.log('Need a store and user to create an order.')
        return
    }

    const order = await prisma.order.create({
        data: {
            orderNumber: `TEST-${Date.now()}`,
            storeId: store.id,
            createdById: user.id,
            status: 'approved',
            items: {
                create: {
                    productId: product.id,
                    quantity: 15,
                    price: product.mrp,
                    total: 15 * product.mrp
                }
            }
        }
    })
    console.log(`Created approved order ${order.orderNumber} for 15 ${product.name}.`)

    console.log('\nLogic Check:')
    console.log(`- Expected Cumulative Need: 15`)
    console.log(`- Expected Shortfall: 5 (15 - 10)`)
    console.log(`- Expected Store View: 'Incomplete' (10 < 15)`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
