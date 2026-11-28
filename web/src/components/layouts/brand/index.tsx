/** The wordmark: the one place the display serif carries the brand, never a heading. */
export function Brand({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const scale = size === 'sm' ? 'text-base' : 'text-lg'

  return (
    <span
      className={`font-display text-porcelain-50 inline-flex items-baseline font-semibold tracking-[-0.01em] ${scale}`}
      translate="no"
    >
      Spenicle
      <span aria-hidden="true" className="text-brass-400">
        .
      </span>
    </span>
  )
}
