import type { ReactNode } from 'react'

/** Full-height page shell with safe areas and mobile scroll. */
export function ScreenPage({
  children,
  center = false,
  className = '',
}: {
  children: ReactNode
  center?: boolean
  className?: string
}) {
  return (
    <main
      className={`min-h-dvh flex flex-col animate-fade-in px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] ${center ? 'items-center justify-center' : ''} ${className}`}
    >
      {children}
    </main>
  )
}

/** Scrollable column for long forms on small phones. */
export function ScreenScroll({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-md mx-auto flex-1 min-h-0 overflow-y-auto overscroll-contain ${className}`}>
      {children}
    </div>
  )
}

interface ScreenCardProps {
  children: ReactNode
  title: string
  subtitle?: ReactNode
  headerAction?: ReactNode
  className?: string
}

export function ScreenCard({ children, title, subtitle, headerAction, className = '' }: ScreenCardProps) {
  return (
    <div
      className={`w-full max-w-md mx-auto rounded-2xl bg-white/85 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 pr-1">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-ink)]">{title}</h2>
          {subtitle && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{subtitle}</p>
          )}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      {children}
    </div>
  )
}

export const btnPrimary =
  'w-full rounded-2xl bg-[var(--color-btn)] text-[var(--color-btn-fg)] py-3.5 sm:py-4 text-base font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed'

export const btnSecondary =
  'w-full rounded-2xl bg-white/80 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 py-3.5 sm:py-4 text-base font-medium hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm'

export const btnRow =
  'flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-1'

export const btnRowHalf =
  'flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition'

export const btnRowPrimary =
  'flex-1 rounded-xl bg-[var(--color-btn)] text-[var(--color-btn-fg)] py-3.5 font-semibold hover:opacity-90 transition disabled:opacity-50'

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl px-3 py-2.5">
      {children}
    </p>
  )
}
