import { QrCode as ArkQrCode } from '@ark-ui/react/qr-code'

type QrCodeProps = {
  value: string
  /** pixel size of one module; the rendered code is this times the module count */
  size?: number | undefined
}

/**
 * Ark owns the encoder and the module path; we own the light pad, which is what keeps the
 * code scannable on a dark screen. The frame reads Ark's own `--qrcode-*` size variables
 * because Ark publishes the measured size as CSS custom properties, not as a style prop.
 */
export function QrCode({ value, size }: QrCodeProps) {
  return (
    <ArkQrCode.Root
      value={value}
      pixelSize={size}
      className="bg-porcelain-50 inline-flex rounded-md p-3"
    >
      <ArkQrCode.Frame className="text-ink-950 h-[var(--qrcode-height)] w-[var(--qrcode-width)] fill-current">
        <ArkQrCode.Pattern />
      </ArkQrCode.Frame>
    </ArkQrCode.Root>
  )
}
