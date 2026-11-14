import type { Workout } from "@reph/contracts";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { useExercises, useSettings, useUploadPhoto } from "../api/hooks";
import { useActiveWorkoutStore } from "../stores/activeWorkout";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Icon } from "../components/ui/Icon";
import { compressImage } from "../lib/image";
import { EntryCard } from "../components/workout/EntryCard";
import { FinishSummary } from "../components/workout/FinishSummary";
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
      <FinishSummary
        sets={sets}
        volume={volume}
        reps={reps}
        exercises={workout.entries.map((entry) => ({
          id: entry.id,
          name: exercisesById.get(entry.exerciseId)?.name ?? entry.exerciseId,
          doneSets: entry.sets.filter((set) => set.done).length,
        }))}
        title={finishTitle}
        notes={finishNotes}
        photo={finishPhoto}
        uploading={uploadPhoto.isPending}
        onTitleChange={setFinishTitle}
        onNotesChange={setFinishNotes}
        onPhotoChange={(file) => {
          if (file) void compressImage(file).then(setFinishPhoto);
          else setFinishPhoto(null);
        }}
        onCancel={() => setFinishOpen(false)}
        onFinish={() => void finish()}
      />
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
    <section aria-labelledby="workout-title" className="flex flex-col gap-7">
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
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
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
        className="flex min-h-[50px] items-center justify-center gap-2 rounded-radius bg-surface-2 text-[15px] font-medium text-text"
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
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
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
            className="order-2 min-w-0 flex-1 text-[15px] font-medium focus:border-accent md:w-[420px] md:max-w-none md:flex-none md:text-base"
            onBlur={(event) => commitTitle(event.target.value.trim())}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          <Button
            className="order-3 ml-auto min-h-10 rounded-full px-[18px] text-sm md:order-7 md:min-h-11 md:px-[22px] md:text-[15px]"
            onClick={onFinish}
            disabled={sets === 0}
            title={sets === 0 ? t("workout.finishNeedsSets") : undefined}
          >
            {t("workout.finish")}
          </Button>
        </div>

        <div className="order-4 flex w-full items-center gap-4 md:order-4 md:contents">
          <div className="order-1 flex items-center gap-3.5 text-text-muted md:order-4">
            <Stat label={t("detail.volume")} value={`${Math.round(volume)}`} />
            <Stat label={t("detail.sets")} value={String(sets)} />
            <Stat label={t("detail.reps")} value={String(reps)} />
          </div>
          <RestTimerBadge className="order-2 md:order-3" />
          <span className="hidden h-5 w-px bg-border md:order-5 md:block" />
          <span className="numeric order-3 ml-auto text-xl md:order-6">{elapsed}</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className="numeric text-xs font-medium md:text-[13px]">{value}</span>
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
