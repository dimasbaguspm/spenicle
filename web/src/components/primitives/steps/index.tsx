import { Steps as ArkSteps } from '@ark-ui/react/steps'
import { Check } from 'lucide-react'

import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

type StepItem = {
  value: string
  title: string
  description?: string | undefined
}

type StepsProps = {
  step: number
  items: StepItem[]
}

/** Ark owns the step count, the current index and the aria; brass marks the current step, jade the done ones. */
export function Steps({ step, items }: StepsProps) {
  return (
    <ArkSteps.Root step={step} count={items.length} orientation="vertical" className="w-full">
      <ArkSteps.List>
        {items.map((item, index) => (
          <ArkSteps.Item
            key={item.value}
            index={index}
            className="group grid grid-cols-[auto_1fr] gap-3"
          >
            <ArkSteps.Indicator
              className={cn(
                'border-border text-text-muted mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors',
                'group-data-[current]:border-accent group-data-[current]:bg-accent group-data-[current]:text-on-accent',
                'group-data-[complete]:border-success group-data-[complete]:bg-success group-data-[complete]:text-on-accent',
              )}
            >
              <Text as="span" tone="caption" className="text-inherit group-data-[complete]:hidden">
                {index + 1}
              </Text>
              <Check
                className="hidden size-3 group-data-[complete]:block"
                aria-hidden="true"
                strokeWidth={1.75}
              />
            </ArkSteps.Indicator>
            <div className="min-w-0 pb-6">
              <ArkSteps.Trigger type="button" className="block text-left">
                <Text
                  as="span"
                  tone="body"
                  className="text-text-muted group-data-[current]:text-text group-data-[complete]:text-success"
                >
                  {item.title}
                </Text>
              </ArkSteps.Trigger>
              {item.description === undefined ? null : (
                <Text as="p" tone="caption" className="pt-0.5">
                  {item.description}
                </Text>
              )}
            </div>
          </ArkSteps.Item>
        ))}
      </ArkSteps.List>
    </ArkSteps.Root>
  )
}
