import variables from "../../../design-tokens/figma-variables.json";

type Variable = { name: string; values: Record<string, { color?: string; alias?: string }> };

const all = new Map<string, Variable>(
  (variables.collections as { variables: Variable[] }[]).flatMap((collection) => collection.variables.map((v) => [v.name, v] as const)),
);

/**
 * Warna token dalam mode Terang sebagai hex, untuk gambar berbagi yang dirender tanpa CSS (issue #114). Alias diikuti
 * sampai primitive, mis. `color/status/partial/bg` menjadi `amber/100`, lalu `#FFF7DE`.
 */
export function tokenColor(name: string): string {
  const variable = all.get(name);
  if (!variable) throw new Error(`Token warna tidak ada: ${name}`);
  const value = variable.values.Terang ?? variable.values.Value;
  if (value?.color) return value.color;
  if (value?.alias) return tokenColor(value.alias);
  throw new Error(`Token warna tanpa nilai: ${name}`);
}
