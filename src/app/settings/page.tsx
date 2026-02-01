import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
        redirect('/')
    }

    return <SettingsClient userId={session.user.id} />
}
