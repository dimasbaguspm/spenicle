import { Text } from '@/components/primitives/text'
import { useVersion } from '@/hooks/use-version'

/** Tag plus short sha, or `dev` from a local build: the answer to "is this the image I think it is". */
export function Version() {
  const version = useVersion()
  const raw = version.data ?? ''

  if (raw === '') {
    return null
  }

  return (
    <Text as="span" tone="caption" className="text-text-faint font-mono">
      {/^\d/.test(raw) ? `v${raw}` : raw}
    </Text>
  )
}
