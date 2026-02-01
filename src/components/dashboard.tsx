'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  Banknote,
  ClipboardList,
  Factory,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Store,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface DashboardProps {
  user: {
    name: string
    email: string
    role: string
  }
}

const menuItems: { name: string; href: string; icon: LucideIcon }[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Stores', href: '/stores', icon: Store },
  { name: 'Orders', href: '/orders', icon: ClipboardList },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: Banknote },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Purchase', href: '/purchase', icon: Factory },
]

const adminOnlyItems: { name: string; href: string; icon: LucideIcon }[] = [
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Dashboard({ user }: DashboardProps) {
  const isAdmin = user.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-green-600">Arunya ERP</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {user.name} ({user.role})
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm transition min-h-[44px]"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" aria-hidden />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800">
            Welcome back, {user.name}!
          </h2>
          <p className="text-gray-600 mt-1">
            Select a module below to get started.
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition flex flex-col items-center gap-2 min-h-[120px] justify-center"
              >
                <Icon className="w-10 h-10 text-green-600" aria-hidden />
                <span className="font-medium text-gray-700">{item.name}</span>
              </Link>
            )
          })}

          {/* Admin Only Items */}
          {isAdmin &&
            adminOnlyItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition flex flex-col items-center gap-2 border-2 border-yellow-400 min-h-[120px] justify-center"
                >
                  <Icon className="w-10 h-10 text-green-600" aria-hidden />
                  <span className="font-medium text-gray-700">{item.name}</span>
                  <span className="text-xs text-yellow-600">Admin Only</span>
                </Link>
              )
            })}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            <strong>Arunya O&apos;Naturals ERP</strong> - All modules are now active! Manage your products, stores, orders, invoices, payments, inventory and production.
          </p>
        </div>
      </main>
    </div>
  )
}
