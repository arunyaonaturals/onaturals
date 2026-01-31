import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { InventoryClient } from './inventory-client'

export default async function InventoryPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <InventoryClient isAdmin={session.user.role === 'admin'} />
}
