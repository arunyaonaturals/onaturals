const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const { db } = require('../src/lib/db')

async function checkOrders() {
    console.log('Using database:', process.env.TURSO_DATABASE_URL)
    try {
        const orders = await db.order.findMany({
            where: { status: 'approved' },
            include: { store: true }
        })
        console.log('Approved orders found:', orders.length)
        console.log(JSON.stringify(orders, null, 2))
    } catch (err) {
        console.error('Prisma Error:', err)
    }
}

checkOrders().catch(console.error)
