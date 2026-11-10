import type { Workout } from "@reph/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { useExercises, useSettings, useUploadPhoto } from "../api/hooks";
import { useActiveWorkoutStore } from "../stores/activeWorkout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Icon } from "../components/ui/Icon";
import { compressImage } from "../lib/image";
import { EntryCard } from "../components/workout/EntryCard";
import { ExercisePicker } from "../components/workout/ExercisePicker";
import { RestTimerBadge } from "../components/workout/RestTimer";
import { useElapsedTick } from "../lib/useElapsedTick";

// Active workout screen — sticky header (editable title, elapsed ticker,
// Finish, ⋯ → body weight + discard), EntryCards, offline banner
// (writes blocked while offline, PRD-FE §4) — Task 9.

export function ActiveWorkoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const workout = useActiveWorkoutStore((state) => state.workout);
  const exercises = useExercises();
  const settings = useSettings();
  const online = useOnlineStatus();
  const [hydrated, setHydrated] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finishTitle, setFinishTitle] = useState("");
  const [finishNotes, setFinishNotes] = useState("");
  const [finishPhoto, setFinishPhoto] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = useUploadPhoto();

  // boot: hydrate the server row; no active workout → redirected home
  useEffect(() => {
    void useActiveWorkoutStore
      .getState()
      .hydrate()
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !workout) void router.navigate({ to: "/" });
  }, [hydrated, workout, router]);

  const exercisesById = useMemo(
    () => new Map((exercises.data ?? []).map((exercise) => [exercise.id, exercise])),
    [exercises.data],
  );

  const finish = async () => {
    if (!workout) return;
    if (finishTitle.trim() !== "") {
      await useActiveWorkoutStore.getState().setTitle(finishTitle.trim());
    }
    if (finishNotes.trim() !== "") {
      await useActiveWorkoutStore.getState().setNotes(finishNotes.trim());
    }
    await useActiveWorkoutStore.getState().finishWorkout();
    if (finishPhoto)
      await uploadPhoto
        .mutateAsync({ file: finishPhoto, workoutId: workout.id })
        .catch(() => undefined);
    setFinishOpen(false);
    void router.navigate({ to: "/history" });
  };

  if (finishOpen && workout) {
    const sets = workout.entries.reduce((c, e) => c + e.sets.filter((s) => s.done).length, 0);
    const volume = workout.entries.reduce(
      (s, e) =>
        s +
        e.sets.reduce(
          (i, set) =>
            i +
            (set.done && set.type !== "warmup" && set.weightKg !== null && set.reps !== null
              ? set.weightKg * set.reps
              : 0),
          0,
        ),
      0,
    );
    const reps = workout.entries.reduce(
      (c, e) => c + e.sets.filter((s) => s.done).reduce((r, s) => r + (s.reps ?? 0), 0),
      0,
    );
    return (
      <section aria-labelledby="finish-title" className="flex flex-col gap-4">
        <h2 id="finish-title" className="text-2xl font-medium">
          {t("workout.finishCelebration")}
        </h2>
        <p className="text-sm text-text-muted">{t("workout.finishSummary")}</p>
        <Card className="grid grid-cols-3 gap-2 py-3 text-center">
          <div>
            <p className="numeric text-xl">{sets}</p>
            <p className="text-xs text-text-muted">{t("detail.sets")}</p>
          </div>
          <div>
            <p className="numeric text-xl">{Math.round(volume)}</p>
            <p className="text-xs text-text-muted">{t("detail.volume")}</p>
          </div>
          <div>
            <p className="numeric text-xl">{reps}</p>
            <p className="text-xs text-text-muted">{t("detail.reps")}</p>
          </div>
        </Card>
        <ul className="flex flex-col gap-1 text-sm">
          {workout.entries.map((e) => {
            const ex = exercisesById.get(e.exerciseId);
            const doneSets = e.sets.filter((s) => s.done).length;
            return (
              <li
                key={e.id}
                className="flex justify-between rounded-sm border border-border bg-surface px-3 py-2"
              >
                <span>{ex?.name ?? e.exerciseId}</span>
                <span className="numeric text-text-muted">
                  {doneSets} {t("routines.sets")}
                </span>
              </li>
            );
          })}
        </ul>
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          {t("workout.title")}
          <Input
            aria-label={t("workout.title")}
            value={finishTitle}
            onChange={(e) => setFinishTitle(e.target.value)}
            placeholder={t("workout.titlePlaceholder")}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          {t("workout.notes")}
          <Input
            aria-label={t("workout.notes")}
            value={finishNotes}
            onChange={(e) => setFinishNotes(e.target.value)}
            placeholder={t("workout.notesPlaceholder")}
          />
        </label>
        <div className="flex flex-col gap-1 text-sm text-text-muted">
          {t("photos.title")}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void compressImage(f).then((cf) => setFinishPhoto(cf));
              e.target.value = "";
            }}
          />
          <Button variant="secondary" onClick={() => photoInputRef.current?.click()}>
            {finishPhoto ? finishPhoto.name : t("photos.upload")}
          </Button>
          {finishPhoto ? (
            <img src={URL.createObjectURL(finishPhoto)} alt="" className="mt-2 max-h-40 rounded" />
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setFinishOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button className="flex-1" loading={uploadPhoto.isPending} onClick={() => void finish()}>
            {t("workout.finish")}
          </Button>
        </div>
      </section>
    );
  }

  if (!workout) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <section aria-labelledby="workout-title" className="flex flex-col gap-3">
      {!online ? (
        <div role="status" className="rounded-sm bg-warning/10 px-3 py-2 text-sm text-warning">
          {t("common.offlineWrite")}
        </div>
      ) : null}

      <StickyHeader
        workout={workout}
        onBack={() => void router.navigate({ to: "/" })}
        onFinish={() => {
          setFinishTitle(workout.title);
          setFinishOpen(true);
        }}
      />

      {/* From md up the entry cards sit side by side (pen.dev design). */}
      <div className="grid gap-3 md:grid-cols-2 md:items-start">
        {workout.entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            exercise={exercisesById.get(entry.exerciseId)}
            entries={workout.entries}
            weightUnit={settings.data?.weightUnit ?? "kg"}
            distanceUnit={settings.data?.distanceUnit ?? "km"}
            disabled={!online}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label={t("workout.addExercise")}
        onClick={() => setPickerOpen(true)}
        className="flex min-h-12 items-center justify-center gap-2 rounded-radius bg-surface-2 text-sm font-medium text-text"
      >
        <Icon name="plus" size={16} />
        {t("workout.addExercise")}
      </button>

      {workout.entries.length === 0 ? (
        <EmptyState
          title={t("workout.emptyTitle")}
          body={t("workout.emptyBody")}
          action={undefined}
        />
      ) : null}

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(exerciseId) => void useActiveWorkoutStore.getState().addExercise(exerciseId)}
      />
    </section>
  );
}

function StickyHeader({
  workout,
  onBack,
  onFinish,
}: {
  workout: Workout;
  onBack: () => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  const elapsed = useElapsedTick(workout.startTime);
  const sets = workout.entries.reduce(
    (count, entry) => count + entry.sets.filter((set) => set.done).length,
    0,
  );
  const volume = workout.entries.reduce(
    (sum, entry) =>
      sum +
      entry.sets.reduce(
        (inner, set) =>
          inner +
          (set.done && set.type !== "warmup" && set.weightKg !== null && set.reps !== null
            ? set.weightKg * set.reps
            : 0),
        0,
      ),
    0,
  );
  const reps = workout.entries.reduce(
    (count, entry) =>
      count + entry.sets.filter((set) => set.done).reduce((sum, set) => sum + (set.reps ?? 0), 0),
    0,
  );

  const commitTitle = (title: string) => {
    if (title !== workout.title) void useActiveWorkoutStore.getState().setTitle(title);
  };

  return (
    <div className="sticky top-0 z-20 -mx-4 bg-background px-4 pb-2 pt-1">
      {/* Mobile: back + title + Finish on the first row, stats on the left
          and the elapsed clock on the right of the second row. From md up
          everything dissolves into one bar (back · title · clock · Finish). */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-full items-center gap-2 md:contents">
          <button
            type="button"
            aria-label={t("common.back")}
            onClick={onBack}
            className="order-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-text-muted"
          >
            <Icon name="arrow-left" size={18} />
          </button>
          <Input
            aria-label={t("workout.title")}
            defaultValue={workout.title === "" ? "" : workout.title}
            placeholder={t("workout.titlePlaceholder")}
            className="order-2 min-w-0 flex-1 font-medium focus:border-accent md:max-w-md"
            onBlur={(event) => commitTitle(event.target.value.trim())}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          <Button className="order-3 ml-auto rounded-full md:order-6" onClick={onFinish}>
            {t("workout.finish")}
          </Button>
        </div>

        <div className="order-4 flex w-full items-center gap-4 md:order-4 md:contents">
          <div className="order-1 flex items-center gap-4 text-xs text-text-muted md:hidden">
            <Stat label={t("detail.volume")} value={`${Math.round(volume)}`} />
            <Stat label={t("detail.sets")} value={String(sets)} />
            <Stat label={t("detail.reps")} value={String(reps)} />
          </div>
          <RestTimerBadge className="order-2 md:order-4" />
          <span className="numeric order-3 ml-auto text-xl font-medium md:order-5">{elapsed}</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-[0.65rem] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className="numeric text-sm font-medium">{value}</span>
    </span>
  );
}

/** navigator.onLine with a live update listener (PRD-FE §4). */
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  return online;
}
