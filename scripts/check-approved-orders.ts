import { db } from '../src/lib/db'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function checkOrders() {
    console.log('Using database:', process.env.TURSO_DATABASE_URL)
    const orders = await db.order.findMany({
        where: { status: 'approved' },
        include: { store: true }
    })
    console.log('Approved orders found:', orders.length)
    console.log(JSON.stringify(orders, null, 2))
}

checkOrders().catch(console.error)
