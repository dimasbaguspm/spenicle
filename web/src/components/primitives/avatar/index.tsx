import { Avatar as ArkAvatar } from '@ark-ui/react/avatar'

import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

type AvatarProps = {
  name: string
  src?: string | undefined
  size?: 'sm' | 'md' | 'lg'
}

const box: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-12 text-base',
}

/** Ark owns the load/error state that swaps image for fallback; the initials and the size stay ours. */
export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  return (
    <ArkAvatar.Root
      className={cn(
        'bg-cherry-800 relative inline-flex shrink-0 overflow-hidden rounded-full select-none',
        box[size],
      )}
    >
      {src === undefined ? null : (
        <ArkAvatar.Image src={src} alt={name} className="size-full object-cover" />
      )}
      <ArkAvatar.Fallback className="bg-cherry-800 text-porcelain-100 flex size-full items-center justify-center font-medium tracking-wide">
        <Text as="span" tone="caption" className="text-inherit">
          {initials(name)}
        </Text>
      </ArkAvatar.Fallback>
    </ArkAvatar.Root>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.at(0) ?? ''
  const last = parts.length > 1 ? (parts.at(-1)?.at(0) ?? '') : ''

  return `${first}${last}`.toUpperCase()
}
