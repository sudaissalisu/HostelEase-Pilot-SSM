'use client'

import * as React from 'react'
import Cropper, { type Point, type Area } from 'react-easy-crop'
import { Check, X, ZoomIn, ZoomOut, RotateCcw, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface ImageCropperProps {
  file: File | null
  onCrop: (dataUrl: string) => void
  onCancel: () => void
  aspectRatio?: number
  title?: string
}

// Output resolution for the cropped image.
const OUTPUT_SIZE = 400

/**
 * ImageCropper — a modal crop dialog powered by `react-easy-crop`.
 *
 * Features:
 *   • Drag to pan the image
 *   • Pinch / slider zoom
 *   • Aspect-ratio-locked crop area
 *   • Outputs a compressed JPEG data URL at OUTPUT_SIZE × OUTPUT_SIZE
 *
 * This replaces the old custom canvas-based cropper which was hard to
 * use (no drag, zoom only via slider, no visual crop frame).
 */
export function ImageCropper({
  file,
  onCrop,
  onCancel,
  aspectRatio = 1,
  title = 'Crop Image',
}: ImageCropperProps) {
  const [imageSrc, setImageSrc] = React.useState<string>('')
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null)

  // Load the image when a file is provided
  React.useEffect(() => {
    if (!file) {
      setImageSrc('')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      // Reset state for the new image
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setCroppedAreaPixels(null)
    }
    reader.onerror = () => {
      console.error('[ImageCropper] Failed to read file')
    }
    reader.readAsDataURL(file)
  }, [file])

  const onCropComplete = React.useCallback(
    (croppedArea: Area, croppedAreaPx: Area) => {
      setCroppedAreaPixels(croppedAreaPx)
    },
    []
  )

  const handleCrop = React.useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return
    try {
      const croppedImageUrl = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      )
      onCrop(croppedImageUrl)
    } catch (e) {
      console.error('[ImageCropper] Crop failed:', e)
    }
  }, [imageSrc, croppedAreaPixels, rotation, onCrop])

  const handleReset = React.useCallback(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
  }, [])

  // "Use Original" — reads the raw file as a data URL and passes it to
  // onCrop without any cropping. This preserves the original aspect ratio
  // (e.g. a rectangular logo won't be force-cut to a square).
  const handleUseOriginal = React.useCallback(() => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onCrop(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [file, onCrop])

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Drag to position, use the slider to zoom. Click Apply to crop, or Use Original to keep the full image.
          </DialogDescription>
        </DialogHeader>

        {/* Crop area — react-easy-crop handles drag/zoom/touch */}
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/90 select-none">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition
              showGrid
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
              Loading image…
            </div>
          )}
        </div>

        {/* Zoom slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ZoomOut className="h-3 w-3" /> Zoom
            </span>
            <span className="tabular-nums font-medium">{zoom.toFixed(1)}x</span>
            <ZoomIn className="h-3 w-3" />
          </div>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(v) => setZoom(v[0])}
          />
        </div>

        {/* Rotation slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Rotation</span>
            <span className="tabular-nums font-medium">{rotation}°</span>
          </div>
          <Slider
            value={[rotation]}
            min={0}
            max={360}
            step={1}
            onValueChange={(v) => setRotation(v[0])}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
            {/* "Use Original" — skips cropping entirely and passes the raw
                image as-is. Useful for rectangular logos/banners that
                shouldn't be force-cropped to a square. */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUseOriginal}
              title="Use the image as-is without cropping (preserves original aspect ratio)"
            >
              <ImageIcon className="h-4 w-4 mr-1.5" /> Use Original
            </Button>
            <Button size="sm" onClick={handleCrop} disabled={!croppedAreaPixels}>
              <Check className="h-4 w-4 mr-1.5" /> Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Helper: crop the image to a data URL
// ---------------------------------------------------------------------------

/**
 * Creates a cropped image data URL from the source image + crop area.
 * Uses a canvas to perform the crop + optional rotation.
 *
 * This is the standard react-easy-crop canvas crop implementation —
 * it reads the pixelCrop area directly from the source image and draws
 * only that region to the output canvas.
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number
): Promise<string> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  // Set canvas to the crop area dimensions (or OUTPUT_SIZE, whichever is smaller)
  const maxSize = Math.max(pixelCrop.width, pixelCrop.height)
  const scale = Math.min(1, OUTPUT_SIZE / maxSize)
  canvas.width = Math.round(pixelCrop.width * scale)
  canvas.height = Math.round(pixelCrop.height * scale)

  // If there's rotation, we need to rotate the canvas first
  if (rotation) {
    const rotRad = (rotation * Math.PI) / 180
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(rotRad)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)
  }

  // Draw only the cropped region from the source image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  )

  // Return as PNG to preserve transparency for logos/icons
  return canvas.toDataURL('image/png')
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}
