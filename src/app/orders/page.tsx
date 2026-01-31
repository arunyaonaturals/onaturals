import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { OrdersClient } from './orders-client'

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <OrdersClient 
      isAdmin={session.user.role === 'admin'} 
      userId={session.user.id}
    />
  )
}
