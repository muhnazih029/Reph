import type { Equipment, Exercise, ExerciseType, MuscleGroup } from "@reph/contracts";
import { useMemo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateExercise, useExerciseFeed, type ExerciseFilters } from "../api/hooks";
import { muscleGroupSchema, equipmentSchema } from "@reph/contracts";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Sheet } from "../components/ui/Sheet";
import { Skeleton } from "../components/ui/Skeleton";
import { ExerciseListItem } from "../components/exercise/ExerciseListItem";
import { Icon } from "../components/ui/Icon";

// Library browser — search (debounced 200 ms) with the icon inside the
// field, muscle-group filter chips, sticky group headers, infinite scroll
// and a FAB create form (Task 7).

const ALL_GROUP = "all" as const;
type GroupFilter = typeof ALL_GROUP | MuscleGroup;

export function ExercisesScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupFilter>(ALL_GROUP);
  const [createOpen, setCreateOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // Debounce the search field into the server query param.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const filters: ExerciseFilters = useMemo(
    () => ({
      q: query || undefined,
      muscleGroup: group === ALL_GROUP ? undefined : group,
    }),
    [query, group],
  );
  const exercises = useExerciseFeed(filters);

  // Pull the next page when the sentinel nears the viewport.
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (exercises.hasNextPage && !exercises.isFetchingNextPage) {
          void exercises.fetchNextPage();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [exercises.hasNextPage, exercises.isFetchingNextPage, exercises.fetchNextPage]);

  const all = useMemo(() => (exercises.data?.pages ?? []).flat(), [exercises.data]);

  // The library is paged; group what has loaded so far so a group that
  // continues on the next page keeps one header.
  const groups = useMemo(() => {
    const map = new Map<MuscleGroup, Exercise[]>();
    for (const exercise of all) {
      const list = map.get(exercise.muscleGroup) ?? [];
      list.push(exercise);
      map.set(exercise.muscleGroup, list);
    }
    return Array.from(map.entries());
  }, [all]);

  return (
    <section aria-label={t("exercises.title")}>
      {/* Sticky search + filter chips. The top padding stays at 0 so the
          gap to the segmented control matches the Routines side. */}
      <div className="sticky top-0 z-20 -mx-4 mb-2 flex flex-col gap-2 bg-background px-4 pb-1 pt-0">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          >
            <Icon name="search" size={16} />
          </span>
          <Input
            aria-label={t("exercises.search")}
            type="search"
            placeholder={t("exercises.search")}
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div
          className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label={t("muscleGroups.title")}
        >
          {(
            [ALL_GROUP, "chest", "back", "shoulders", "thighs", "hips", "cardio"] as GroupFilter[]
          ).map((option) => {
            const selected = option === group;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setGroup(option)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? "border-accent bg-accent text-accent-contrast"
                    : "border-border text-text-muted"
                }`}
              >
                {option === ALL_GROUP ? t("exercises.all") : t(`muscleGroups.${option}`)}
              </button>
            );
          })}
        </div>
      </div>

      {exercises.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
        </div>
      ) : exercises.error ? (
        <ErrorState
          message={exercises.error instanceof Error ? exercises.error.message : undefined}
          onRetry={() => void exercises.refetch()}
        />
      ) : groups.length === 0 ? (
        <EmptyState title={t("exercises.empty")} />
      ) : (
        <Card className="overflow-hidden">
          {groups.map(([muscleGroup, list]) => (
            <div key={muscleGroup}>
              <h3 className="sticky top-0 z-10 bg-surface px-4 pt-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                {t(`muscleGroups.${muscleGroup}`)}
              </h3>
              <ul className="divide-y divide-border">
                {list.map((exercise) => (
                  <li key={exercise.id}>
                    <ExerciseListItem exercise={exercise} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      )}

      <div ref={sentinel} aria-hidden="true" />
      {exercises.isFetchingNextPage ? <Skeleton className="h-12 w-full" /> : null}

      {/* FAB — bottom-right, just above the tab bar on mobile */}
      <button
        type="button"
        aria-label={t("exercises.create")}
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-20 right-5 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-accent text-accent-contrast transition-colors hover:bg-accent/90 md:bottom-6 md:right-6"
      >
        <Icon name="plus" size={22} />
      </button>

      <CreateExerciseSheet open={createOpen} onOpenChange={setCreateOpen} />
    </section>
  );
}

type Draft = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  type: ExerciseType;
};

function CreateExerciseSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const create = useCreateExercise();
  const [draft, setDraft] = useState<Draft>({
    name: "",
    muscleGroup: "chest",
    equipment: "barbell",
    type: "strength",
  });

  const nameError = draft.name.trim().length === 0;
  const canSubmit = !nameError;

  const submit = () => {
    if (!canSubmit) return;
    create.mutate(
      {
        name: draft.name.trim(),
        muscleGroup: draft.muscleGroup,
        equipment: draft.equipment,
        type: draft.type,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  // reset the form whenever the sheet reopens
  useEffect(() => {
    if (open) {
      setDraft({ name: "", muscleGroup: "chest", equipment: "barbell", type: "strength" });
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("exercises.create")}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          {t("exercises.name")}
          <Input
            aria-label={t("exercises.name")}
            placeholder={t("exercises.namePlaceholder")}
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </label>
        {nameError ? (
          <p role="alert" className="text-xs text-danger">
            {t("exercises.nameRequired")}
          </p>
        ) : null}

        <SegmentedControl<ExerciseType>
          label={t("exerciseType.title")}
          options={[
            { value: "strength", label: t("exerciseType.strength") },
            { value: "cardio", label: t("exerciseType.cardio") },
          ]}
          value={draft.type}
          onChange={(type) => setDraft({ ...draft, type })}
        />

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          {t("exercises.muscleGroup")}
          <select
            aria-label={t("exercises.muscleGroup")}
            className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-text"
            value={draft.muscleGroup}
            onChange={(event) =>
              setDraft({ ...draft, muscleGroup: event.target.value as MuscleGroup })
            }
          >
            {muscleGroupSchema.options.map((value) => (
              <option key={value} value={value}>
                {t(`muscleGroups.${value}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          {t("exercises.equipment")}
          <select
            aria-label={t("exercises.equipment")}
            className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-text"
            value={draft.equipment}
            onChange={(event) => setDraft({ ...draft, equipment: event.target.value as Equipment })}
          >
            {equipmentSchema.options.map((value) => (
              <option key={value} value={value}>
                {t(`equipment.${value}`)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" className="flex-1" disabled={!canSubmit} loading={create.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
