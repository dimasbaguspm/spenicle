import { Brand } from '@/components/layouts/brand'
import { ThemeToggle } from '@/components/layouts/theme-toggle'
import { Version } from '@/components/layouts/version'
import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

/**
 * One footer for both shells: the wordmark, the one sentence about what this is, the build, and the
 * theme control. The signed-in shell hides it below `lg`, where the thumb bar already owns the
 * bottom of the screen; the signed-out shell always shows it, because there is nothing else there.
 */
export function ShellFooter({
  width = 'max-w-[96rem]',
  className,
}: {
  width?: string | undefined
  className?: string | undefined
}) {
  return (
    <footer className={cn('border-border/60 border-t', className)}>
      <div
        className={cn(
          'mx-auto flex w-full flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8',
          width,
        )}
      >
        <div className="flex items-center gap-3">
          <Brand size="sm" />
          <Text as="span" tone="caption" className="text-text-faint">
            Self-hosted. One household. No telemetry.
          </Text>
        </div>
        <div className="flex items-center gap-3">
          <Version />
          <ThemeToggle />
        </div>
      </div>
    </footer>
  )
}
