import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// Icon generator — pure-PNG PNG writer (no image toolchain needed on the
// dev box). Produces the PWA manifest icons (Phase 1 Task 5):
// a flat accent tile with a white barbell glyph; maskable variants draw
// the glyph inside the 80% safe zone.

const CRC_TABLE = new Uint32Array(256).map((_, i) => {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(input: Uint8Array): number {
  let checksum = 0xffffffff;
  for (const byte of input) checksum = CRC_TABLE[(checksum ^ byte) & 0xff]! ^ (checksum >>> 8);
  return (checksum ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const head = new Uint8Array(4);
  new DataView(head.buffer).setUint32(0, data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), Buffer.from(data)]);
  const tail = new Uint8Array(4);
  new DataView(tail.buffer).setUint32(0, crc32(body));
  return Buffer.concat([head, body, tail]);
}

/** Encode an RGBA pixel buffer as a PNG. */
function encodePng(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let row = 0; row < height; row++) {
    raw[row * (1 + width * 4)] = 0; // filter: none
    pixels.copy(raw, row * (1 + width * 4) + 1, row * width * 4, (row + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

const ACCENT = [0x2f, 0xe0, 0x8e] as const; // brand green
const BG = [0x0a, 0x0a, 0x0b] as const; // near-black
const WHITE = [0xff, 0xff, 0xff] as const;

/** Render the Reph tile: background, rounded accent square, barbell glyph. */
function renderIcon(size: number, maskable: boolean): Uint8Array {
  const pixels = Buffer.alloc(size * size * 4);

  const set = (x: number, y: number, [r, g, b]: readonly number[]) => {
    const i = (y * size + x) * 4;
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = 0xff;
  };

  // background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) set(x, y, BG);
  }

  // accent square with ~13% corner rounding; maskable pads the glyph instead of the tile
  const radius = Math.round(size * 0.13);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inCornerX = Math.min(x, size - 1 - x);
      const inCornerY = Math.min(y, size - 1 - y);
      const cornerDistance = Math.hypot(
        Math.max(0, radius - inCornerX),
        Math.max(0, radius - inCornerY),
      );
      if (cornerDistance <= radius) set(x, y, ACCENT);
    }
  }

  // barbell glyph: shaft + two plates each side
  const scale = maskable ? 0.44 : 0.6; // glyph width fraction of tile
  const inner = Math.round((size / 2) * scale);
  const cx = size / 2;
  const cy = size / 2;
  const shaft = Math.max(2, Math.round(size * 0.035));
  const plate = Math.max(3, Math.round(size * 0.09));
  const plateHeight = Math.round(size * scale * 0.72);

  for (let y = Math.round(cy - plateHeight / 2); y < Math.round(cy + plateHeight / 2); y++) {
    for (let x = Math.round(cx - inner); x < Math.round(cx + inner); x++) {
      const isShaft = Math.abs(y - cy + 0.5) <= shaft / 2 && Math.abs(x - cx + 0.5) <= inner;
      const nearLeft = Math.abs(x - (cx - inner) + 0.5) <= plate;
      const nearRight = Math.abs(x - (cx + inner - plate) - 0.5) <= plate;
      if (isShaft || nearLeft || nearRight) set(x, y, WHITE);
    }
  }

  return encodePng(size, size, pixels);
}

const outDir = join(import.meta.dir, "..", "public", "icons");
for (const [size, suffix, maskable] of [
  [512, "", false],
  [512, "-maskable", true],
  [192, "", false],
  [192, "-maskable", true],
] as const) {
  const file = join(outDir, `icon-${size}${suffix}.png`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, renderIcon(size, maskable));
  console.log(`wrote ${file}`);
}
