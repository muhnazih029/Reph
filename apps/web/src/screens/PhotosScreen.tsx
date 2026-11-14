import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { usePhotos, useUploadPhoto, useDeletePhoto } from "../api/hooks";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { compressImage } from "../lib/image";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";

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
    <section aria-labelledby="photos-title" className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label={t("weight.back")}
          onClick={() => void router.navigate({ to: "/history" })}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <Icon name="arrow-left" size={16} />
        </button>
        <h2 id="photos-title" className="min-w-0 flex-1 text-2xl font-semibold">
          {t("photos.title")}
        </h2>
        <Button
          className="shrink-0 min-h-13 rounded-radius px-6 text-base"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? t("photos.uploading") : t("photos.upload")}
        </Button>
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

      {photos.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (photos.data ?? []).length === 0 ? (
        <EmptyState title={t("photos.empty")} body={t("photos.emptyBody")} />
      ) : (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
          {(photos.data ?? []).map((p) => (
            <div key={p.id} className="relative">
              <button type="button" onClick={() => setPreview(p.id)} className="block w-full">
                <img
                  src={`/api/v1/photos/${p.id}/image`}
                  alt={p.notes || t("photos.photo")}
                  className="aspect-square w-full rounded-sm object-cover"
                  loading="lazy"
                />
              </button>
              <button
                type="button"
                aria-label={t("photos.delete")}
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs leading-none text-white"
                onClick={() => void remove.mutateAsync(p.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {(photos.data ?? []).length >= limit ? (
        <Button variant="secondary" className="text-[13px]" onClick={() => setLimit((l) => l + 20)}>
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
