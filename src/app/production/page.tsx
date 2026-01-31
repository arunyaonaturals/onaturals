import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ProductionClient } from './production-client'

export default async function ProductionPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <ProductionClient isAdmin={session.user.role === 'admin'} />
}
