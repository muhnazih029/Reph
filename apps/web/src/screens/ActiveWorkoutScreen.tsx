import type { Workout } from "@reph/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { useExercises, useSettings, useUploadPhoto } from "../api/hooks";
import { useActiveWorkoutStore } from "../stores/activeWorkout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Sheet } from "../components/ui/Sheet";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { compressImage } from "../lib/image";
import { EntryCard } from "../components/workout/EntryCard";
import { ExercisePicker } from "../components/workout/ExercisePicker";

// Active workout screen — sticky header (editable title, elapsed ticker,
// Finish, ⋯ → body weight + discard), EntryCards, offline banner
// (writes blocked while offline, PRD-FE §4) — Task 9.

/** Elapsed mm:ss since workout start, re-rendered every second. */
function useElapsedTick(startTime: number): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ActiveWorkoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const workout = useActiveWorkoutStore((state) => state.workout);
  const exercises = useExercises();
  const settings = useSettings();
  const online = useOnlineStatus();
  const [hydrated, setHydrated] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
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
    if (finishTitle.trim() !== "") {
      await useActiveWorkoutStore.getState().setTitle(finishTitle.trim());
    }
    if (finishNotes.trim() !== "") {
      await useActiveWorkoutStore.getState().setNotes(finishNotes.trim());
    }
    await useActiveWorkoutStore.getState().finishWorkout();
    if (finishPhoto) await uploadPhoto.mutateAsync(finishPhoto).catch(() => undefined);
    setFinishOpen(false);
    void router.navigate({ to: "/history" });
  };

  if (finishOpen && workout) {
    const sets = workout.entries.reduce((c, e) => c + e.sets.filter((s) => s.done).length, 0);
    const volume = workout.entries.reduce(
      (s, e) =>
        s +
        e.sets.reduce(
          (i, set) => i + (set.done && set.type !== "warmup" && set.weightKg !== null && set.reps !== null ? set.weightKg * set.reps : 0),
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
              <li key={e.id} className="flex justify-between rounded-sm border border-border bg-surface px-3 py-2">
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
              if (f) void compressImage(f).then(setFinishPhoto);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" onClick={() => photoInputRef.current?.click()}>
            {finishPhoto ? finishPhoto.name : t("photos.upload")}
          </Button>
          {finishPhoto ? (
            <img
              src={URL.createObjectURL(finishPhoto)}
              alt=""
              className="mt-2 max-h-40 rounded"
            />
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
        onMenu={() => setMenuOpen(true)}
        onFinish={() => {
          setFinishTitle(workout.title);
          setFinishOpen(true);
        }}
      />

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

      <button
        type="button"
        aria-label={t("workout.addExercise")}
        onClick={() => setPickerOpen(true)}
        className="min-h-12 rounded-radius border border-dashed border-border text-sm text-text-muted"
      >
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

      <WorkoutMenuSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        workout={workout}
        onDiscard={() => {
          setMenuOpen(false);
          setDiscardOpen(true);
        }}
      />

      <Sheet open={discardOpen} onOpenChange={setDiscardOpen} title={t("workout.discard")}>
        <div className="flex flex-col gap-3 pb-3">
          <p className="text-sm text-text-muted">{t("workout.discardConfirm")}</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDiscardOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                void useActiveWorkoutStore
                  .getState()
                  .discardWorkout()
                  .then(() => {
                    setDiscardOpen(false);
                    void router.navigate({ to: "/" });
                  });
              }}
            >
              {t("workout.discard")}
            </Button>
          </div>
        </div>
      </Sheet>
    </section>
  );
}

function StickyHeader({
  workout,
  onMenu,
  onFinish,
}: {
  workout: Workout;
  onMenu: () => void;
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
      <div className="flex items-center gap-2">
        <Input
          aria-label={t("workout.title")}
          defaultValue={workout.title === "" ? "" : workout.title}
          placeholder={t("workout.titlePlaceholder")}
          className="min-w-0 flex-1 border-transparent bg-transparent text-lg font-medium focus:border-border focus:bg-surface"
          onBlur={(event) => commitTitle(event.target.value.trim())}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <Button onClick={onFinish}>{t("workout.finish")}</Button>
        <button
          type="button"
          aria-label={t("workout.menu")}
          onClick={onMenu}
          className="min-h-11 min-w-9 text-lg text-text-muted"
        >
          ⋯
        </button>
      </div>
      <div className="mt-1 flex items-center gap-5">
        <Stat label={t("detail.duration")} value={elapsed} />
        <Stat label={t("detail.volume")} value={`${Math.round(volume)}`} />
        <Stat label={t("detail.sets")} value={String(sets)} />
        <Stat label={t("detail.reps")} value={String(reps)} />
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
      <span className="numeric text-sm font-medium text-accent">{value}</span>
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

function WorkoutMenuSheet({
  open,
  onOpenChange,
  workout,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: Workout;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();
  const [bodyWeight, setBodyWeight] = useState<string | null>(null);

  const commit = () => {
    if (bodyWeight === null) return;
    const parsed = bodyWeight.trim() === "" ? null : Number(bodyWeight.replace(",", "."));
    void useActiveWorkoutStore
      .getState()
      .setBodyWeight(Number.isFinite(parsed as number) ? (parsed as number) : null);
    setBodyWeight(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("workout.menu")}>
      <div className="flex flex-col gap-3 pb-3">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          {t("workout.bodyWeight")}
          <Input
            aria-label={t("workout.bodyWeight")}
            numeric
            defaultValue={workout.bodyWeightKg === null ? "" : String(workout.bodyWeightKg)}
            onChange={(event) => setBodyWeight(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </label>
        <Button variant="danger" onClick={onDiscard}>
          {t("workout.discard")}
        </Button>
      </div>
    </Sheet>
  );
}
