import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ProductsClient } from './products-client'

export default async function ProductsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <ProductsClient isAdmin={session.user.role === 'admin'} />
}
