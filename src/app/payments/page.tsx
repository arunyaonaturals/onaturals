import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { PaymentsClient } from './payments-client'

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <PaymentsClient isAdmin={session.user.role === 'admin'} userId={session.user.id} />
}
