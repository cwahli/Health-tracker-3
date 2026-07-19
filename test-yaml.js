import { parse } from 'yaml';
const text = `- biomarker: "chlamydia_dna_detection"
  date: "09-Jun-2026"
  updated_at: 1715878400`;
try {
  const parsed = parse(text);
  console.log(parsed);
} catch (e) {
  console.log("Error:", e.message);
}
