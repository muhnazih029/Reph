import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";

// Photo editor for the workout photo — a square (1:1) crop with the
// basics: zoom, drag to reposition, rotate by 90°. The result is a plain
// JPEG file, so the upload path downstream is unchanged.

const OUTPUT = 1024;

type Rotation = 0 | 90 | 180 | 270;

export function PhotoEditor({
  source,
  onCancel,
  onSave,
}: {
  source: File | null;
  onCancel: () => void;
  onSave: (file: File) => void;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Load the picked file into an image element we can draw from.
  useEffect(() => {
    if (!source) {
      setImage(null);
      return;
    }
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImage(img);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [source]);

  /** The image's footprint after the current rotation. */
  const footprint = () => {
    const img = imageRef.current;
    if (!img) return { w: 1, h: 1 };
    const quarter = rotation === 90 || rotation === 270;
    return { w: quarter ? img.height : img.width, h: quarter ? img.width : img.height };
  };

  /** How far the image may be dragged before it would leave the square. */
  const bounds = () => {
    const img = imageRef.current;
    if (!img) return { x: 0, y: 0 };
    const { w, h } = footprint();
    const scale = Math.max(OUTPUT / w, OUTPUT / h) * zoom;
    return {
      x: Math.max(0, (w * scale - OUTPUT) / 2),
      y: Math.max(0, (h * scale - OUTPUT) / 2),
    };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, OUTPUT, OUTPUT);
    if (!img) return;
    const { w, h } = footprint();
    const scale = Math.max(OUTPUT / w, OUTPUT / h) * zoom;
    ctx.save();
    ctx.translate(OUTPUT / 2 + offset.x, OUTPUT / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
    ctx.restore();
  }, [zoom, rotation, offset]);

  useEffect(() => {
    draw();
  }, [draw, image]);

  // Keep the image covering the square while zooming.
  useEffect(() => {
    const limit = bounds();
    setOffset((current) => ({
      x: Math.min(limit.x, Math.max(-limit.x, current.x)),
      y: Math.min(limit.y, Math.max(-limit.y, current.y)),
    }));
  }, [zoom, rotation, image]);

  const rotate = (delta: number) => {
    setRotation((current) => ((current + delta) % 360) as Rotation);
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const factor = OUTPUT / rect.width;
    setOffset((current) => ({
      x: current.x + (event.clientX - drag.x) * factor,
      y: current.y + (event.clientY - drag.y) * factor,
    }));
    dragRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onSave(new File([blob], "workout-photo.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <Sheet
      open={Boolean(source)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={t("photos.editTitle")}
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-radius border border-border bg-surface-2">
          <canvas
            ref={canvasRef}
            width={OUTPUT}
            height={OUTPUT}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          />
        </div>

        <p className="text-center text-xs text-text-muted">{t("photos.cropHint")}</p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t("photos.rotateLeft")}
            onClick={() => rotate(-90)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-text-muted transition-colors hover:text-text"
          >
            <Icon name="refresh" size={18} />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            aria-label={t("photos.zoom")}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-11 w-full accent-accent"
          />
          <button
            type="button"
            aria-label={t("photos.rotateRight")}
            onClick={() => rotate(90)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-text-muted transition-colors hover:text-text"
          >
            <Icon name="refresh" size={18} className="-scale-x-100" />
          </button>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button className="flex-1" onClick={save}>
            {t("photos.usePhoto")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
