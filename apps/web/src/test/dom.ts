import { Window } from "happy-dom";

// happy-dom global registration — loaded as the bunfig test preload BEFORE
// any other module (docs/guides/DEVELOPMENT.md §6), and safe to import
// directly from tests. react-dom decides its change-event handling at
// module-load time, so the DOM must exist before react-dom is evaluated.

if (!("__rephDomRegistered" in globalThis)) {
  Object.defineProperty(globalThis, "__rephDomRegistered", { value: true });

  const window = new Window({ url: "http://localhost/" });

  for (const key of Object.getOwnPropertyNames(window)) {
    // do not shadow bun's own globals (crypto.randomUUID, performance, …)
    if (
      [
        "window",
        "self",
        "globalThis",
        "top",
        "parent",
        "frames",
        "crypto",
        "performance",
        "console",
      ].includes(key)
    ) {
      continue;
    }
    if (key in globalThis) continue;
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: (window as unknown as Record<string, unknown>)[key],
    });
  }
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: window,
  });

  // bun ships inert Event globals; happy-dom's dispatchEvent does
  // `instanceof window.Event`, so force-install the window's classes.
  for (const key of [
    "Event",
    "CustomEvent",
    "EventTarget",
    "KeyboardEvent",
    "MouseEvent",
    "FocusEvent",
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) {
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
  }

  // react-dom: `isInputEventSupported = "oninput" in document && …` runs at
  // module load; happy-dom documents have no on* handler slots. Without
  // this, the change plugin falls back to the IE polyfill and dispatched
  // input/change events are silently ignored.
  // oxlint-disable-next-line unicorn/prefer-add-event-listener
  (window.document as unknown as { oninput: null }).oninput = null;
}
