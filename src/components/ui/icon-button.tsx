'use client'

import { type LucideIcon } from 'lucide-react'

type Variant = 'edit' | 'delete' | 'print' | 'view' | 'default' | 'primary'

const variantClasses: Record<Variant, string> = {
  edit: 'text-gray-400 hover:text-green-600 hover:bg-green-50',
  delete: 'text-gray-400 hover:text-red-500 hover:bg-red-50',
  print: 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
  view: 'text-gray-400 hover:text-blue-600 hover:bg-blue-50',
  default: 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
  primary: 'text-white bg-green-600 hover:bg-green-700',
}

interface IconButtonProps {
  icon: LucideIcon
  label: string
  variant?: Variant
  onClick?: () => void
  href?: string
  className?: string
  size?: 'sm' | 'md'
}

export function IconButton({
  icon: Icon,
  label,
  variant = 'default',
  onClick,
  href,
  className = '',
  size = 'md',
}: IconButtonProps) {
  const sizeClass = size === 'sm' ? 'p-2 min-w-[36px] min-h-[36px]' : 'p-2.5 min-w-[44px] min-h-[44px]'
  const baseClass = `inline-flex items-center justify-center rounded-xl transition-all active:scale-95 ${sizeClass} ${variantClasses[variant]} ${className}`

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith('http') || href.includes('/print') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className={baseClass}
        title={label}
        aria-label={label}
      >
        <Icon className="w-4 h-4" aria-hidden />
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClass}
      title={label}
      aria-label={label}
    >
      <Icon className="w-4 h-4" aria-hidden />
    </button>
  )
}
