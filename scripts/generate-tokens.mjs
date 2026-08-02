import { readFile, writeFile } from "node:fs/promises";

const sourceUrl = new URL("../app/design-tokens.json", import.meta.url);
const outputUrl = new URL("../app/tokens.css", import.meta.url);
const tokens = JSON.parse(await readFile(sourceUrl, "utf8"));

function segment(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function variableName(path) {
  return `--${path.slice(1).map(segment).join("-")}`;
}

function color(value) {
  if (value.hex && value.alpha === undefined) return value.hex;
  const channels = value.components.map((channel) => Math.round(channel * 255));
  return `rgb(${channels.join(" ")} / ${value.alpha ?? 1})`;
}

function dimension(value) {
  return `${value.value}${value.unit}`;
}

function cssValue(type, value) {
  if (typeof value === "string" && /^\{.+\}$/.test(value)) {
    return `var(${variableName(value.slice(1, -1).split("."))})`;
  }

  switch (type) {
    case "color":
      return color(value);
    case "dimension":
    case "duration":
      return dimension(value);
    case "fontFamily":
      return value
        .map((family) => /^(serif|sans-serif|monospace|system-ui)$/.test(family) ? family : `"${family}"`)
        .join(", ");
    case "fontWeight":
      return String(value);
    case "cubicBezier":
      return `cubic-bezier(${value.join(", ")})`;
    case "shadow": {
      const shadows = Array.isArray(value) ? value : [value];
      return shadows.map((shadow) => [
        shadow.inset ? "inset" : "",
        dimension(shadow.offsetX),
        dimension(shadow.offsetY),
        dimension(shadow.blur),
        dimension(shadow.spread),
        typeof shadow.color === "string" ? cssValue("color", shadow.color) : color(shadow.color),
      ].filter(Boolean).join(" ")).join(", ");
    }
    default:
      throw new Error(`Unsupported token type: ${type}`);
  }
}

function collect(group, path, inheritedType, output) {
  const type = group.$type ?? inheritedType;
  for (const [name, value] of Object.entries(group)) {
    if (name.startsWith("$")) continue;
    const nextPath = [...path, name];
    if (value && typeof value === "object" && "$value" in value) {
      output.push(`  ${variableName(nextPath)}: ${cssValue(value.$type ?? type, value.$value)};`);
    } else if (value && typeof value === "object") {
      collect(value, nextPath, value.$type ?? type, output);
    }
  }
}

const sections = [
  ["Reference tokens", "reference"],
  ["Semantic tokens", "semantic"],
  ["Component tokens", "component"],
];
const lines = [":root {"];

for (const [label, key] of sections) {
  lines.push(`  /* ${label} */`);
  collect(tokens[key], [key], tokens[key].$type, lines);
  lines.push("");
}

lines.push("}", "", "@media (prefers-reduced-motion: reduce) {", "  :root {", "    --motion-duration-fast: 1ms;", "    --motion-duration-normal: 1ms;", "    --motion-duration-slow: 1ms;", "  }", "}", "");

await writeFile(outputUrl, lines.join("\n"), "utf8");
