// Unit conversion + display — storage is canonical kg/meters (PRD §1.3).

const KG_PER_LB = 2.20462;
const KM_PER_MI = 0.621371;

export function kgToLb(kg: number): number {
  return kg * KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb / KG_PER_LB;
}

export function kmToMi(km: number): number {
  return km * KM_PER_MI;
}

export function miToKm(mi: number): number {
  return mi / KM_PER_MI;
}

/** "80 kg" / "176.4 lb" / "80.0 kg" — one decimal, trailing ".0" stripped
 * for whole kg. Null weight renders as "–". */
export function displayWeight(kg: number | null, unit: "kg" | "lbs"): string {
  if (kg === null) return "–";
  const value = unit === "kg" ? kg : kgToLb(kg);
  const suffix = unit === "kg" ? "kg" : "lb";
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${suffix}`;
}
