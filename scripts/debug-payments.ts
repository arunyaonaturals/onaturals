import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN,
})
const prisma = new PrismaClient({ adapter })

async function main() {
    const invoices = await prisma.invoice.findMany({
        include: { store: true }
    })
    console.log('--- INVOICES ---')
    invoices.forEach(inv => {
        console.log(`ID: ${inv.id}, Num: ${inv.invoiceNumber}, Total: ${inv.totalAmount}, Bal: ${inv.balanceAmount}, Status: ${inv.status}, Store: ${inv.store.name}`)
    })

    const payments = await prisma.payment.findMany({
        include: { invoice: true }
    })
    console.log('\n--- PAYMENTS ---')
    payments.forEach(p => {
        console.log(`ID: ${p.id}, Num: ${p.paymentNumber}, InvID: ${p.invoiceId}, InvNum: ${p.invoice?.invoiceNumber}, Amount: ${p.amount}`)
    })
}

main().catch(console.error).finally(() => prisma.$disconnect())
