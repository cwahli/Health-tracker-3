// Pure, side-effect-free helpers extracted from server.ts so they can be unit
// tested without importing server.ts (which starts a live HTTP server and
// initializes Firebase Admin as soon as the module loads).
// Do not add imports here that create side effects (firebase, fs, express).
// Extracted verbatim on 2026-07-20 — do not change behavior.

// Simple and robust custom JS object-to-YAML stringifier
export function jsToYaml(val: any, indent: number = 0): string {
  const spaces = " ".repeat(indent);
  if (val === null) return "null";
  if (val === undefined) return "null";
  if (typeof val === "string") {
    if (val.includes("\n")) {
      return "|\n" + val.split("\n").map(line => spaces + "  " + line).join("\n");
    }
    if (val.includes(":") || val.includes("#") || val.startsWith("-")) {
      return `"${val.replace(/"/g, '\\"')}"`;
    }
    return val;
  }
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    let out = "";
    for (const item of val) {
      if (typeof item === "object" && item !== null) {
        const inner = jsToYaml(item, indent + 2);
        const lines = inner.split("\n");
        out += `\n${spaces}- ${lines[0].trim()}`;
        if (lines.length > 1) {
          out += "\n" + lines.slice(1).join("\n");
        }
      } else {
        out += `\n${spaces}- ${jsToYaml(item, indent + 2)}`;
      }
    }
    return out;
  }
  if (typeof val === "object") {
    const keys = Object.keys(val);
    if (keys.length === 0) return "{}";
    let out = "";
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = val[k];
      const prefix = i === 0 && indent > 0 ? "" : spaces;
      if (typeof v === "object" && v !== null) {
        out += `${prefix}${k}:${Array.isArray(v) ? "" : "\n"}${jsToYaml(v, indent + (Array.isArray(v) ? 0 : 2))}\n`;
      } else {
        out += `${prefix}${k}: ${jsToYaml(v, indent + 2)}\n`;
      }
    }
    return out.trim();
  }
  return String(val);
}

export function extractBalancedJson(text: string): string {
  let cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const startIdx = cleaned.indexOf("{");
  if (startIdx !== -1) {
    let depth = 0;
    for (let i = startIdx; i < cleaned.length; i++) {
      if (cleaned[i] === "{") depth++;
      else if (cleaned[i] === "}") depth--;
      if (depth === 0) {
        return cleaned.substring(startIdx, i + 1);
      }
    }
  }
  return cleaned;
}

// Defensive numeric guard for weight values coming from LLM output.
// Number(x) alone is not safe here: an overlong digit string overflows to
// Infinity, and "Infinity || fallback" still evaluates to Infinity because
// Infinity is truthy. This rejects non-finite and unreasonably large values.
export function sanitizeMealWeight(value: any, fallback: number, maxGrams: number = 10000): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > maxGrams) return fallback;
  return Math.round(n);
}
