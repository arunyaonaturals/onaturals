import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { StoresClient } from './stores-client'

export default async function StoresPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <StoresClient isAdmin={session.user.role === 'admin'} />
}
