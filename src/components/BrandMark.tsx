import { useId } from 'react'

interface BrandMarkProps {
  className?: string
  title?: string
}

/** App icon mark — claimed box with blue/red edges and four dots. */
export function BrandMark({ className = 'size-10', title = 'Dots & Boxes' }: BrandMarkProps) {
  const gid = useId().replace(/:/g, '')
  const gradId = `brandMarkBg-${gid}`

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${gradId})`} />
      <rect x="18" y="18" width="28" height="28" rx="4" fill="#2563eb" fillOpacity="0.22" />
      <path d="M18 18h28" stroke="#3b82f6" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M18 18v28" stroke="#3b82f6" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M18 46h28" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M46 18v28" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="18" cy="18" r="4.2" fill="#f8fafc" />
      <circle cx="46" cy="18" r="4.2" fill="#f8fafc" />
      <circle cx="18" cy="46" r="4.2" fill="#f8fafc" />
      <circle cx="46" cy="46" r="4.2" fill="#f8fafc" />
    </svg>
  )
}

interface BrandLockupProps {
  className?: string
  markClassName?: string
  titleClassName?: string
  subtitle?: string
}

/** Mark + wordmark used on the landing screen. */
export function BrandLockup({
  className = '',
  markClassName = 'size-14 sm:size-16',
  titleClassName = 'text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--color-ink)]',
  subtitle = 'Classic grid game',
}: BrandLockupProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <BrandMark className={`${markClassName} shrink-0 drop-shadow-sm`} />
      <div>
        {subtitle && (
          <p className="text-sm font-medium tracking-wide text-slate-500 uppercase">{subtitle}</p>
        )}
        <h1 className={titleClassName}>Dots & Boxes</h1>
      </div>
    </div>
  )
}
