import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { PurchaseClient } from './purchase-client'

export default async function PurchasePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <PurchaseClient isAdmin={session.user.role === 'admin'} />
}
