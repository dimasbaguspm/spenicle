import type { Settings } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { absent } from '@/lib/text'

/** The three facts about the instance a self-hoster needs to read back: no edits, all locked. */
export function SettingsFacts({ settings }: { settings: Settings | undefined }) {
  const facts = [
    {
      label: 'Base currency',
      value: settings?.base_currency ?? absent,
      locked: 'locked',
    },
    { label: 'Timezone', value: settings?.timezone ?? absent, locked: 'set at boot' },
    {
      label: 'Extraction',
      value: settings?.extraction_enabled === true ? 'wired' : 'manual entry',
      locked: 'from the environment',
    },
  ]

  return (
    <section className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
      {facts.map((fact) => (
        <div key={fact.label} className="space-y-1">
          <Text as="p" tone="section">
            {fact.label}
          </Text>
          <Text as="p" tone="figure" className="text-porcelain-100">
            {fact.value}
          </Text>
          <Text as="p" tone="caption">
            {fact.locked}
          </Text>
        </div>
      ))}
    </section>
  )
}
