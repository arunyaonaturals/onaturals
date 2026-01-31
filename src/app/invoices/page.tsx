import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { InvoicesClient } from './invoices-client'

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <InvoicesClient isAdmin={session.user.role === 'admin'} />
}
