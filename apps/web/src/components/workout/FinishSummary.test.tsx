import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { FinishSummary } from "./FinishSummary";
import "../../i18n";

// Finish Summary — the last screen of a workout (pen.dev design):
// celebration block, the three summary numbers, the per-exercise
// breakdown, then title / notes / photo before the commit.

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

function render(props: Partial<Parameters<typeof FinishSummary>[0]> = {}): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const all: Parameters<typeof FinishSummary>[0] = {
    sets: 4,
    volume: 2160,
    reps: 27,
    exercises: [
      { id: "e1", name: "Barbell Bench Press", doneSets: 3 },
      { id: "e2", name: "Overhead Press", doneSets: 1 },
    ],
    title: "Push day — LP1",
    notes: "",
    photo: null,
    uploading: false,
    onTitleChange: () => {},
    onNotesChange: () => {},
    onPhotoChange: () => {},
    onCancel: () => {},
    onFinish: () => {},
    ...props,
  };
  createRoot(container).render(createElement(FinishSummary, all));
  return container;
}

describe("FinishSummary", () => {
  it("shows the celebration, the summary numbers and the exercise breakdown", async () => {
    const container = render();
    await flush();
    const text = container.textContent ?? "";
    expect(text).toContain("Great job! Workout complete.");
    expect(text).toContain("Here's your summary");
    // the three metrics, formatted with thousands separators
    expect(text).toContain("4");
    expect(text).toContain("2,160");
    expect(text).toContain("27");
    expect(text).toContain("Sets");
    expect(text).toContain("Volume");
    expect(text).toContain("Reps");
    // one row per exercise with its finished set count
    expect(text).toContain("Barbell Bench Press");
    expect(text).toContain("3 sets");
    expect(text).toContain("Overhead Press");
    // plural: one finished set reads "1 set", not "1 sets"
    expect(text).toContain("1 set");
    expect(text).not.toContain("1 sets");
  });

  it("carries the title and notes values into their inputs", async () => {
    const container = render({ title: "Push day — LP1", notes: "felt strong" });
    await flush();
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="Workout title"]')?.value,
    ).toBe("Push day — LP1");
    expect(
      container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Notes"]')?.value,
    ).toBe("felt strong");
  });

  it("offers cancel and finish as the committing actions", async () => {
    const container = render();
    await flush();
    const buttons = [...container.querySelectorAll("button")];
    const cancel = buttons.find((node) => node.textContent?.includes("Cancel"));
    const finish = buttons.find((node) => node.textContent?.includes("Finish"));
    expect(cancel).toBeTruthy();
    expect(finish).toBeTruthy();
    expect(finish?.textContent).toContain("Finish");
  });

  it("shows the upload area and swaps it for edit/remove once a photo is set", async () => {
    const empty = render();
    await flush();
    expect(empty.textContent).toContain("Upload");
    expect(empty.textContent).toContain("Choose file");
    expect(empty.textContent).toContain("Progress photo");

    const photo = new File([new Uint8Array([1, 2, 3])], "progress.jpg", { type: "image/jpeg" });
    let cleared: File | null | undefined;
    const container = render({
      photo,
      onPhotoChange: (file) => {
        cleared = file;
      },
    });
    await flush();
    expect(container.textContent).toContain("Edit");
    expect(container.textContent).toContain("Remove");

    const remove = [...container.querySelectorAll("button")].find((node) =>
      node.textContent?.includes("Remove"),
    );
    remove?.click();
    await flush();
    expect(cleared).toBeNull();
  });
});
