import { TagsInput as ArkTagsInput } from '@ark-ui/react/tags-input'
import { X } from 'lucide-react'

type TagsInputProps = {
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string | undefined
}

/** Ark owns the splitting, the paste rules and in-place tag editing; the sunken chips are ours. */
export function TagsInput({ value, onValueChange, placeholder }: TagsInputProps) {
  return (
    <ArkTagsInput.Root
      value={value}
      onValueChange={(details) => {
        onValueChange(details.value)
      }}
      className="border-border bg-surface focus-within:border-accent flex flex-wrap items-center gap-1.5 rounded border px-2 py-1.5 transition-colors"
    >
      <ArkTagsInput.Control className="flex flex-wrap items-center gap-1.5">
        {value.map((tag, position) => (
          <ArkTagsInput.Item
            key={tag}
            index={position}
            value={tag}
            className="bg-surface-sunken text-text data-[state=active]:ring-accent inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs data-[state=active]:ring-1"
          >
            <ArkTagsInput.ItemPreview className="inline-flex items-center gap-1">
              <ArkTagsInput.ItemText />
              <ArkTagsInput.ItemDeleteTrigger className="text-ink-400 hover:text-danger leading-none">
                <X className="size-3" aria-hidden="true" strokeWidth={1.75} />
              </ArkTagsInput.ItemDeleteTrigger>
            </ArkTagsInput.ItemPreview>
            <ArkTagsInput.ItemInput className="bg-surface-sunken text-text outline-none" />
          </ArkTagsInput.Item>
        ))}
        <ArkTagsInput.Input
          placeholder={placeholder}
          className="text-text placeholder:text-ink-400 min-w-24 flex-1 bg-transparent text-sm outline-none"
        />
      </ArkTagsInput.Control>
      <ArkTagsInput.HiddenInput />
    </ArkTagsInput.Root>
  )
}
