import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { PhotoEditor } from "./PhotoEditor";

// Finish sheet — the last screen of a workout: celebration, the summary
// numbers, the per-exercise breakdown, then the optional title/notes/photo
// before the workout is committed. Matches the "Finish Summary" frames in
// the pen.dev design (mobile + desktop, light + dark).

export type FinishExercise = {
  id: string;
  name: string;
  doneSets: number;
};

type FinishSummaryProps = {
  sets: number;
  volume: number;
  reps: number;
  exercises: FinishExercise[];
  title: string;
  notes: string;
  photo: File | null;
  uploading: boolean;
  onTitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onPhotoChange: (file: File | null) => void;
  onCancel: () => void;
  onFinish: () => void;
};

export function FinishSummary({
  sets,
  volume,
  reps,
  exercises,
  title,
  notes,
  photo,
  uploading,
  onTitleChange,
  onNotesChange,
  onPhotoChange,
  onCancel,
  onFinish,
}: FinishSummaryProps) {
  const { t } = useTranslation();
  const photoInputRef = useRef<HTMLInputElement>(null);
  // The file being edited in the photo editor (null = editor closed).
  const [editing, setEditing] = useState<File | null>(null);

  // Object URL for the picked photo — revoked when it changes or unmounts.
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const metrics = [
    { value: sets, label: t("detail.sets") },
    { value: Math.round(volume).toLocaleString(), label: t("detail.volume") },
    { value: reps, label: t("detail.reps") },
  ];

  const pickPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // The picked file opens in the editor (1:1 crop) before it is kept.
    if (file) setEditing(file);
    event.target.value = "";
  };

  return (
    <section
      aria-labelledby="finish-title"
      className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,646fr)_minmax(0,434fr)] lg:items-start lg:gap-6"
    >
      <div className="flex flex-col items-center gap-4 text-center lg:col-start-1 lg:row-start-1">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent lg:h-16 lg:w-16">
          <Icon name="check" size={26} className="lg:h-8 lg:w-8" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="finish-title" className="text-2xl font-semibold text-text">
            {t("workout.finishCelebration")}
          </h2>
          <p className="text-sm text-text-muted">{t("workout.finishSummary")}</p>
        </div>
      </div>

      <Card className="grid grid-cols-3 px-5 py-4 lg:col-start-1 lg:row-start-2">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={`flex flex-col items-center gap-1.5 text-center ${
              index > 0 ? "border-l border-border" : ""
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-text-muted">
              {metric.label}
            </p>
            <p className="numeric text-2xl font-semibold text-text">{metric.value}</p>
          </div>
        ))}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:col-start-1 lg:row-start-3 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6">
        <Card className="order-1 overflow-hidden lg:order-2">
          <ul className="divide-y divide-border">
            {exercises.map((exercise) => (
              <li key={exercise.id} className="flex items-center gap-2 px-4 py-3.5">
                <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full bg-accent" />
                <span className="flex-1 truncate text-sm font-medium text-text">
                  {exercise.name}
                </span>
                <span className="numeric text-xs text-text-muted">
                  {t("workout.setsCount", { count: exercise.doneSets })}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="order-2 flex flex-col gap-3 lg:order-1">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-text-muted">{t("workout.title")}</span>
            <input
              aria-label={t("workout.title")}
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={t("workout.titlePlaceholder")}
              className="min-h-11 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-text-muted">{t("workout.notes")}</span>
            <textarea
              aria-label={t("workout.notes")}
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder={t("workout.notesPlaceholder")}
              className="min-h-11 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none lg:h-[120px] lg:resize-none"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:h-full">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={pickPhoto}
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-radius border border-dashed border-border bg-surface px-4 py-6 text-center transition-colors hover:border-accent hover:bg-accent/5 lg:h-full lg:justify-center lg:gap-4 lg:py-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-accent lg:h-12 lg:w-12">
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon name="image" size={20} />
            )}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-text">
              {photo ? photo.name : t("photos.upload")}
            </span>
            <span className="text-xs text-text-muted">{t("photos.dropHint")}</span>
          </span>
          {!photo ? (
            <span className="inline-flex items-center rounded-sm border border-border px-4 py-2.5 text-[13px] font-semibold text-text">
              {t("photos.chooseFile")}
            </span>
          ) : null}
        </button>

        {photo ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditing(photo)}>
              <Icon name="pencil" size={16} />
              {t("photos.edit")}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => onPhotoChange(null)}>
              <Icon name="trash-2" size={16} />
              {t("photos.remove")}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex gap-3 lg:col-start-1 lg:row-start-4 lg:justify-end">
        <Button
          variant="secondary"
          className="min-h-13 flex-1 lg:w-[140px] lg:flex-none"
          onClick={onCancel}
        >
          {t("common.cancel")}
        </Button>
        <Button
          className="min-h-13 flex-1 lg:w-[180px] lg:flex-none"
          loading={uploading}
          onClick={onFinish}
        >
          {t("workout.finish")}
        </Button>
      </div>

      <PhotoEditor
        source={editing}
        onCancel={() => setEditing(null)}
        onSave={(file) => {
          setEditing(null);
          onPhotoChange(file);
        }}
      />
    </section>
  );
}
