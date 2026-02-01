const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const { db } = require('../src/lib/db')

async function debugData() {
    try {
        const storeName = "ANAMALAISS RETAILS PRIVATE LIMITED"
        const store = await db.store.findFirst({
            where: { name: { contains: storeName } }
        })
        console.log('Store found:', store)

        if (store) {
            const orders = await db.order.findMany({
                where: { storeId: store.id },
                include: { items: { include: { product: true } } }
            })
            console.log('Orders found for store:', orders.length)
            orders.forEach(o => console.log(` - ${o.orderNumber}: ${o.status} (ID: ${o.id})`))

            const targetOrder = orders.find(o => o.orderNumber === "ORD2802013377")
            if (targetOrder) {
                console.log('Target Order Items:', JSON.stringify(targetOrder.items, null, 2))
            }
        }
    } catch (err) {
        console.error('Debug Error:', err)
    }
}

debugData().catch(console.error)
