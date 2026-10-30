import type { Equipment, Exercise, ExerciseType, MuscleGroup } from "@reph/contracts";
import { useMemo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateExercise, useExercises, type ExerciseFilters } from "../api/hooks";
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

// Library browser — search (debounced 200 ms), muscle-group filter via
// bottom-sheet, sticky group headers, FAB create form (Task 7).

const ALL_GROUP = "all" as const;
type GroupFilter = typeof ALL_GROUP | MuscleGroup;

export function ExercisesScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupFilter>(ALL_GROUP);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

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
  const exercises = useExercises(filters);

  const groups = useMemo(() => {
    const map = new Map<MuscleGroup, Exercise[]>();
    for (const exercise of exercises.data ?? []) {
      const list = map.get(exercise.muscleGroup) ?? [];
      list.push(exercise);
      map.set(exercise.muscleGroup, list);
    }
    return Array.from(map.entries());
  }, [exercises.data]);

  return (
    <section aria-labelledby="exercises-title">
      <h2 id="exercises-title" className="mb-4 text-xl font-medium">
        {t("exercises.title")}
      </h2>

      <div className="mb-3 flex gap-2">
        <Input
          aria-label={t("exercises.search")}
          type="search"
          placeholder={t("exercises.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button variant="secondary" onClick={() => setFilterOpen(true)}>
          {t("exercises.filter")}
        </Button>
      </div>

      {group !== ALL_GROUP ? (
        <div className="mb-3 flex items-center gap-2 text-xs text-text-muted">
          <span>{t(`muscleGroups.${group}`)}</span>
          <button
            type="button"
            onClick={() => setGroup(ALL_GROUP)}
            className="min-h-9 rounded-sm border border-border px-2 text-text-muted"
          >
            {t("common.cancel")}
          </button>
        </div>
      ) : null}

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

      {/* FAB — bottom-right, above the tab bar */}
      <button
        type="button"
        aria-label={t("exercises.create")}
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-accent-contrast shadow-lg"
      >
        +
      </button>

      <CreateExerciseSheet open={createOpen} onOpenChange={setCreateOpen} />
      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        value={group}
        onValueChange={setGroup}
      />
    </section>
  );
}

function FilterSheet({
  open,
  onOpenChange,
  value,
  onValueChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: GroupFilter;
  onValueChange: (value: GroupFilter) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("exercises.filter")}>
      <SegmentedControl<GroupFilter>
        label={t("muscleGroups.title")}
        className="max-h-80 flex-wrap overflow-y-auto"
        options={[
          { value: ALL_GROUP, label: t("exercises.all") },
          ...muscleGroupSchema.options.map((group) => ({
            value: group,
            label: t(`muscleGroups.${group}`),
          })),
        ]}
        value={value}
        onChange={(next) => {
          onValueChange(next);
          onOpenChange(false);
        }}
      />
    </Sheet>
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
