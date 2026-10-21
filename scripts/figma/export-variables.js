// Ekspor semua variable lokal (koleksi, mode, code syntax WEB, nilai per mode) sebagai JSON.
// Jalankan lewat Figma MCP (use_figma) atau plugin pengembangan di file AksesBogor, lalu simpan
// hasilnya ke design-tokens/figma-variables.json dan jalankan `pnpm tokens`.
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const byId = new Map(variables.map((v) => [v.id, v]));
const hex = (n) => Math.round(n * 255).toString(16).padStart(2, "0").toUpperCase();
const value = (raw) => {
  if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") return { alias: byId.get(raw.id)?.name ?? raw.id };
  if (raw && typeof raw === "object" && "r" in raw) {
    const a = raw.a ?? 1;
    return { color: `#${hex(raw.r)}${hex(raw.g)}${hex(raw.b)}${a < 1 ? hex(a) : ""}` };
  }
  return { value: raw };
};
return {
  file: figma.fileKey ?? "aTaMQUxVF2P1zQlJY3s4du",
  collections: collections.map((c) => ({
    name: c.name,
    modes: c.modes.map((m) => m.name),
    defaultMode: c.modes.find((m) => m.modeId === c.defaultModeId)?.name,
    variables: c.variableIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((v) => ({
        name: v.name,
        type: v.resolvedType,
        css: v.codeSyntax?.WEB ?? null,
        description: v.description || undefined,
        scopes: v.scopes,
        values: Object.fromEntries(c.modes.map((m) => [m.name, value(v.valuesByMode[m.modeId])])),
      })),
  })),
};
