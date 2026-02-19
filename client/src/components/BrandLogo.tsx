type BrandLogoVariant = 'D' | 'F'
type BrandLogoSize = 'sm' | 'md' | 'lg'

const sizeMap: Record<BrandLogoSize, { mark: string; text: string }> = {
  sm: { mark: 'h-8 w-8 rounded-[10px]', text: 'text-base' },
  md: { mark: 'h-9 w-9 rounded-[12px]', text: 'text-lg' },
  lg: { mark: 'h-12 w-12 rounded-[14px]', text: 'text-2xl' },
}

export default function BrandLogo({
  variant = 'D',
  size = 'md',
  showText = true,
  align = 'center',
}: {
  variant?: BrandLogoVariant
  size?: BrandLogoSize
  showText?: boolean
  align?: 'center' | 'start'
}) {
  const sizeClass = sizeMap[size]

  if (variant === 'F') {
    return (
      <div className={`flex items-center gap-3 ${align === 'start' ? 'justify-start' : 'justify-center'}`}>
        {showText && (
          <span className={`logo-wordmark ${sizeClass.text}`}>
            Content<span className="logo-wordmark-accent">Foundry</span>
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${align === 'start' ? 'justify-start' : 'justify-center'}`}>
      <span className={`logo-mark ${sizeClass.mark}`} aria-hidden>
        <svg viewBox="0 0 32 32" fill="none" className="h-5 w-5 text-slate-200">
          <path
            d="M16 4.5 23.5 12 16 27.5 8.5 12 16 4.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M16 12.5v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16" cy="14" r="2" fill="currentColor" />
          <path d="M12.5 9.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
      {showText && (
        <span className={`logo-wordmark ${sizeClass.text}`}>
          Content<span className="logo-wordmark-accent">Foundry</span>
        </span>
      )}
    </div>
  )
}
