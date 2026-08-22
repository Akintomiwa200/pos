"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Camera, ImagePlus, Upload, X } from "lucide-react";
import {
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGE_ACCEPT,
  productImageSrc,
  validateProductImageFile,
} from "@/lib/product-image";
import { toast } from "@/lib/toast";

type Props = {
  itemId?: string;
  imageUrl?: string;
  disabled?: boolean;
  onChange: (file: File | null) => void;
};

export function ProductImageField({ itemId, imageUrl, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!picked) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(picked);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [picked]);

  function clear(event?: { stopPropagation: () => void }) {
    event?.stopPropagation();
    setPicked(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function applyFile(file: File | null) {
    if (!file) return;
    const message = validateProductImageFile(file);
    if (message) {
      toast.error(new Error(message), "That image couldn't be used.");
      setPicked(null);
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setPicked(file);
    onChange(file);
  }

  function onPick(file: File | null) {
    applyFile(file);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    onPick(event.dataTransfer.files?.[0] ?? null);
  }

  const displaySrc = preview ?? (itemId ? productImageSrc(itemId, imageUrl) : null);
  const hasImage = Boolean(displaySrc);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={PRODUCT_IMAGE_ACCEPT}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
        className={[
          "group relative w-full overflow-hidden rounded-2xl border-2 border-dashed text-left transition",
          dragging
            ? "border-pos-primary bg-pos-primary/5"
            : "border-pos-border bg-pos-surface-muted hover:border-pos-primary/40 hover:bg-pos-surface",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        ].join(" ")}
      >
        <div className="relative aspect-[16/10] w-full">
          {hasImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displaySrc!} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-pos-ink/70 via-pos-ink/10 to-transparent opacity-80 transition group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                <div className="min-w-0 text-white">
                  <p className="text-sm font-medium">
                    {picked ? picked.name : "Current product photo"}
                  </p>
                  <p className="text-xs text-white/80">
                    {picked
                      ? `${(picked.size / 1024).toFixed(0)} KB · click or drop to replace`
                      : "Click or drop a new image to replace"}
                  </p>
                </div>
                {picked ? (
                  <button
                    type="button"
                    onClick={clear}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-white/25"
                  >
                    <X size={14} />
                    Clear
                  </button>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                    <Camera size={14} />
                    Change
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-pos-surface shadow-pos-sm">
                <ImagePlus size={28} className="text-pos-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-pos-ink">Add a product photo</p>
                <p className="mt-1 max-w-xs text-xs text-pos-ink-muted">
                  Drag and drop here, or click to browse. Shown on tills and price check.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-pos-primary px-4 py-2 text-xs font-semibold text-white">
                <Upload size={14} />
                Choose image
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-pos-ink-faint">
        JPG, PNG, WebP, or GIF · max {(MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)).toFixed(0)} MB · stored securely on Cloudinary
      </p>
    </div>
  );
}
