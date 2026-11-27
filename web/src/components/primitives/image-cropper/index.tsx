import { ImageCropper as ArkImageCropper } from '@ark-ui/react/image-cropper'

import { Button } from '@/components/primitives/button'

type ImageCropperProps = {
  src: string
  aspectRatio?: number | undefined
  /** receives the cropped image as a PNG data URL */
  onComplete?: ((dataUrl: string) => void) | undefined
}

/**
 * Ark owns the pan, the zoom, the crop rect and the pixel maths; we own the frame, the
 * corner handles and the confirm button, which asks Ark for the cropped data URL.
 */
export function ImageCropper({ src, aspectRatio, onComplete }: ImageCropperProps) {
  return (
    <ArkImageCropper.Root
      aspectRatio={aspectRatio}
      className="border-border bg-surface-sunken flex flex-col gap-3 rounded-md border p-3"
    >
      <ArkImageCropper.Viewport className="relative aspect-video w-full overflow-hidden rounded">
        <ArkImageCropper.Image src={src} className="max-w-full" />
        <ArkImageCropper.Selection className="border-accent border-2">
          <ArkImageCropper.Handle position="nw" className="bg-accent h-2 w-2" />
          <ArkImageCropper.Handle position="ne" className="bg-accent h-2 w-2" />
          <ArkImageCropper.Handle position="sw" className="bg-accent h-2 w-2" />
          <ArkImageCropper.Handle position="se" className="bg-accent h-2 w-2" />
        </ArkImageCropper.Selection>
      </ArkImageCropper.Viewport>
      {onComplete === undefined ? null : (
        <ArkImageCropper.Context>
          {(cropper) => (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={async () => {
                  const cropped = await cropper.getCroppedImage({ output: 'dataUrl' })
                  if (typeof cropped === 'string') onComplete(cropped)
                }}
              >
                Use crop
              </Button>
            </div>
          )}
        </ArkImageCropper.Context>
      )}
    </ArkImageCropper.Root>
  )
}
