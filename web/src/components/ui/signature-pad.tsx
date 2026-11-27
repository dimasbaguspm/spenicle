import { SignaturePad as ArkSignaturePad } from '@ark-ui/react/signature-pad'

import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'

type SignaturePadProps = {
  /** receives the finished signature as a PNG data URL */
  onEnd?: ((dataUrl: string) => void) | undefined
}

/**
 * Ark owns the pointer capture, the smoothing and the SVG path segments; we own the
 * porcelain pad, the clear trigger and the confirm button that asks Ark for the data URL.
 */
export function SignaturePad({ onEnd }: SignaturePadProps) {
  return (
    <ArkSignaturePad.Root className="flex flex-col gap-2">
      <ArkSignaturePad.Label asChild>
        <Text as="p" tone="caption">
          Sign here
        </Text>
      </ArkSignaturePad.Label>
      <ArkSignaturePad.Control className="border-border-strong bg-porcelain-50 text-ink-950 relative h-32 w-full overflow-hidden rounded border">
        <ArkSignaturePad.Segment className="h-full w-full" />
        <ArkSignaturePad.Guide className="border-border-strong pointer-events-none absolute inset-x-4 bottom-6 border-b border-dashed" />
        <ArkSignaturePad.ClearTrigger className="text-ink-500 hover:text-ink-900 absolute end-2 top-2 rounded text-xs transition-colors">
          Clear
        </ArkSignaturePad.ClearTrigger>
      </ArkSignaturePad.Control>
      {onEnd === undefined ? null : (
        <ArkSignaturePad.Context>
          {(pad) => (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={async () => {
                  const dataUrl = await pad.getDataUrl('image/png')
                  onEnd(dataUrl)
                }}
              >
                Confirm
              </Button>
            </div>
          )}
        </ArkSignaturePad.Context>
      )}
    </ArkSignaturePad.Root>
  )
}
