import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { usePhotos, useUploadPhoto, useDeletePhoto } from "../api/hooks";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { compressImage } from "../lib/image";

export function PhotosScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [limit, setLimit] = useState(20);
  const photos = usePhotos(limit, 0);
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <section aria-labelledby="photos-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t("weight.back")}
          onClick={() => void router.navigate({ to: "/history" })}
          className="flex h-9 w-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          ←
        </button>
        <h2 id="photos-title" className="text-xl font-medium">
          {t("photos.title")}
        </h2>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void compressImage(f).then((cf) => upload.mutateAsync({ file: cf }));
          e.target.value = "";
        }}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
        {upload.isPending ? t("photos.uploading") : t("photos.upload")}
      </Button>

      {photos.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (photos.data ?? []).length === 0 ? (
        <EmptyState title={t("photos.empty")} body={t("photos.emptyBody")} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {(photos.data ?? []).map((p) => (
            <div key={p.id} className="relative">
              <button type="button" onClick={() => setPreview(p.id)} className="block w-full">
                <img
                  src={`/api/v1/photos/${p.id}/image`}
                  alt={p.notes || t("photos.photo")}
                  className="aspect-square w-full rounded object-cover"
                  loading="lazy"
                />
              </button>
              <button
                type="button"
                aria-label={t("photos.delete")}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-xs text-white"
                onClick={() => void remove.mutateAsync(p.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {(photos.data ?? []).length >= limit ? (
        <Button variant="secondary" onClick={() => setLimit((l) => l + 20)}>
          {t("photos.loadMore")}
        </Button>
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <img
            src={`/api/v1/photos/${preview}/image`}
            alt=""
            className="max-h-full max-w-full rounded"
          />
        </div>
      ) : null}
    </section>
  );
}
