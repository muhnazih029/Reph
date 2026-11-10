// One icon set — inline SVG, no icon-library dependency (DESIGN.md §3:
// one system, no dependency creep). 24×24 grid, 2 px stroke, round caps,
// matching the icon language used in the pen.dev design.

export type IconName =
  | "arrow-left"
  | "award"
  | "check"
  | "chevron-right"
  | "chevron-up"
  | "clipboard-list"
  | "dumbbell"
  | "filter"
  | "history"
  | "house"
  | "languages"
  | "layout-grid"
  | "layout-list"
  | "log-out"
  | "moon"
  | "more-horizontal"
  | "pencil"
  | "play"
  | "plus"
  | "refresh"
  | "search"
  | "server"
  | "settings"
  | "sliders"
  | "target"
  | "timer"
  | "trash-2"
  | "user"
  | "weight"
  | "x";

const PATHS: Record<IconName, string[]> = {
  "arrow-left": ["M19 12H5", "m12 19-7-7 7-7"],
  award: ["M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z", "m8.5 13.5-2.5 7 6-2.5 6 2.5-2.5-7"],
  check: ["M20 6 9 17l-5-5"],
  "chevron-right": ["m9 18 6-6-6-6"],
  "chevron-up": ["m18 15-6-6-6 6"],
  "clipboard-list": [
    "M9 4H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3",
    "M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1 1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z",
    "M8 11h8M8 15h6",
  ],
  dumbbell: ["M4 9v6", "M8 7v10", "M16 7v10", "M20 9v6", "M8 12h8"],
  filter: ["M4 5h16l-6 7v6l-4 2v-8z"],
  history: ["M12 7v5l3.5 2", "M3.5 12a8.5 8.5 0 1 0 2.6-6.1", "M3 4v4h4"],
  house: ["M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  languages: ["M4 5h9", "M8.5 3v2c0 3.5-2.5 6.5-4.5 8", "M13 21l3.5-8 3.5 8", "M14.8 17h4.4"],
  "layout-grid": ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  "layout-list": ["M4 6h16", "M4 12h16", "M4 18h16"],
  "log-out": ["M10 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "m16 16 4-4-4-4", "M20 12H10"],
  moon: ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"],
  "more-horizontal": [
    "M5 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0",
    "M11 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0",
    "M17 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0",
  ],
  pencil: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  play: ["M6.5 4.5 19 12 6.5 19.5z"],
  plus: ["M12 5v14", "M5 12h14"],
  refresh: ["M21 12a9 9 0 1 1-2.6-6.4", "M21 4v5h-5"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "m21 21-4.3-4.3"],
  server: ["M4 5h16v6H4z", "M4 13h16v6H4z", "M8 8h.01", "M8 16h.01"],
  settings: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z",
  ],
  sliders: [
    "M4 6h16",
    "M4 12h16",
    "M4 18h16",
    "M16 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
    "M10 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
    "M18 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  ],
  target: [
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
    "M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0z",
  ],
  timer: ["M10 2h4", "M12 14v-4", "M4 13a8 8 0 0 1 16 0", "M12 21a8 8 0 0 0 8-8"],
  "trash-2": [
    "M3 6h18",
    "M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2",
    "M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6",
    "M10 11v6",
    "M14 11v6",
  ],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M5 21a7 7 0 0 1 14 0"],
  weight: ["M6.5 3h11l3 18h-17z", "M12 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
  x: ["M18 6 6 18", "M6 6l12 12"],
};

export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
