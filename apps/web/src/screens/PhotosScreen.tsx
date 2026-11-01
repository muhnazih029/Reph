import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePhotos, useUploadPhoto, useDeletePhoto } from "../api/hooks";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { compressImage } from "../lib/image";

export function PhotosScreen() {
  const { t } = useTranslation();
  const photos = usePhotos();
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <section aria-labelledby="photos-title" className="flex flex-col gap-3">
      <h2 id="photos-title" className="text-xl font-medium">
        {t("photos.title")}
      </h2>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void compressImage(f).then((cf) => upload.mutateAsync(cf));
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
                  className="aspect-square w-full rounded-sm object-cover"
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
