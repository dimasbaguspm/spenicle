import { Camera, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/primitives/button'
import { Text } from '@/components/primitives/text'

/** A camera is a device capability, not a build flag: ask the browser, not the feature list. */
export const cameraSupported = (): boolean =>
  typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia !== undefined

/**
 * The phone as a scanner: the rear camera fills the plate, a hairline frame says where the receipt
 * belongs, and the shutter hands back a JPEG. The stream is opened on demand and stopped on every
 * exit — a live camera left running is a lens light and a battery drain nobody asked for. Capture
 * runs through a canvas, so the bytes that reach the queue are the bytes on screen.
 */
export function CameraShot({ onCapture }: { onCapture: (file: File) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false)
  const [failed, setFailed] = useState(false)

  const stop = () => {
    stream.current?.getTracks().forEach((track) => {
      track.stop()
    })
    stream.current = null
    setLive(false)
  }

  useEffect(() => {
    return () => {
      stream.current?.getTracks().forEach((track) => {
        track.stop()
      })
      stream.current = null
    }
  }, [])

  useEffect(() => {
    if (!live || video.current === null || stream.current === null) {
      return
    }

    video.current.srcObject = stream.current
    void video.current.play().catch(() => {
      /* autoplay is refused until the user interacts; the preview still paints */
    })
  }, [live])

  const start = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      stream.current = media
      setFailed(false)
      setLive(true)
    } catch {
      setFailed(true)
    }
  }

  const capture = () => {
    const element = video.current

    if (element === null || element.videoWidth === 0) {
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = element.videoWidth
    canvas.height = element.videoHeight

    const context = canvas.getContext('2d')

    if (context === null) {
      return
    }

    context.drawImage(element, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          return
        }

        onCapture(new File([blob], `receipt-${String(Date.now())}.jpg`, { type: 'image/jpeg' }))
        stop()
      },
      'image/jpeg',
      0.9,
    )
  }

  if (!live) {
    return (
      <div className="space-y-2">
        <Button
          tone="quiet"
          block
          size="lg"
          onClick={() => {
            void start()
          }}
        >
          <Camera className="size-4" aria-hidden="true" strokeWidth={1.75} />
          Open the camera
        </Button>
        {failed ? (
          <Text as="p" tone="caption" className="text-text-faint">
            The camera did not open. Choose a file instead.
          </Text>
        ) : null}
      </div>
    )
  }

  return (
    <div className="relative h-[58dvh] overflow-hidden rounded-lg bg-black sm:h-96">
      <video
        ref={video}
        playsInline
        muted
        autoPlay
        className="size-full object-cover"
        aria-label="Camera preview"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-6 rounded border border-white/35"
      />

      <Button
        tone="quiet"
        size="sm"
        aria-label="Close the camera"
        className="absolute top-3 right-3 bg-black/50"
        onClick={stop}
      >
        <X className="size-4" aria-hidden="true" strokeWidth={1.75} />
      </Button>

      <div className="absolute inset-x-0 bottom-5 flex justify-center">
        <button
          type="button"
          onClick={capture}
          aria-label="Take the photo"
          className="size-14 rounded-full border-4 border-white/80 bg-white/20 transition-transform active:scale-95"
        />
      </div>
    </div>
  )
}
