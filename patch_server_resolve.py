import re

with open('server.ts', 'r') as f:
    content = f.read()

# Replace the part that maps indices
new_map_code = """
    const resolvedIndices = new Set<number>();
    indices.forEach((rawIdx: any) => {
      // 1. Try to parse as integer (0-based)
      let i = typeof rawIdx === "number" ? rawIdx : parseInt(String(rawIdx).trim(), 10);
      let s = (!isNaN(i) && i >= 0 && i < scoutItems.length) ? scoutItems[i] : null;

      // 2. Fallback: Check if LLM used 1-based indexing (e.g. index 1 for array element 0)
      if (!s && !isNaN(i) && i > 0 && i <= scoutItems.length) {
        const fallbackItem = scoutItems[i - 1];
        if (fallbackItem) {
          s = fallbackItem;
          i = i - 1;
        }
      }

      // 3. Fallback: If rawIdx is a string (like "yakiimo cheese"), perform fuzzy string matching
      if (!s && typeof rawIdx === "string") {
        const cleanRaw = rawIdx.trim().toLowerCase();
        if (cleanRaw.length > 1) {
          const foundIdx = scoutItems.findIndex((item: any) => {
            const kw = (item.keyword || "").toLowerCase();
            const orig = (item.originalName || "").toLowerCase();
            return cleanRaw.includes(kw) || kw.includes(cleanRaw) || cleanRaw.includes(orig) || orig.includes(cleanRaw);
          });
          if (foundIdx !== -1) {
            s = scoutItems[foundIdx];
            i = foundIdx;
          }
        }
      }

      // 4. If we successfully resolved to a scout item, add it to this group
      if (s && i >= 0 && i < scoutItems.length) {
        usedIndices.add(i);
        resolvedIndices.add(i);
        items.push(...explodeScoutItemIntoDishItems(s));
      }
    });

    // Text-only comparisons (no image / no scout items): fall back to plain names.
    if (scoutItems.length === 0 && Array.isArray(g.itemNames)) {
      g.itemNames.forEach((n: string) => {
        if (n) items.push({ name: n, boundingBox2D: null, sourceImageIndex: null });
      });
    }

    return {
      groupName: g.groupName,
      suitability: g.suitability,
      pros: g.pros,
      cons: g.cons,
      topConcernNutrient: g.topConcernNutrient || null,
      keyDifferentiator: g.keyDifferentiator || null,
      averageNutrients: g.averageNutrients || null,
      scoutItemIndices: Array.from(resolvedIndices),
      items
    };
"""

# The regex to replace
pattern = r"    indices\.forEach\(\(rawIdx: any\) => \{[\s\S]*?items\n    \};\n  \}\);"

if re.search(pattern, content):
    content = re.sub(pattern, new_map_code.strip() + "\n  });", content)
else:
    print("Pattern 1 not found!")

missing_code = """
  if (scoutItems.length > 0) {
    const missing = scoutItems.filter((_: any, i: number) => !usedIndices.has(i));
    if (missing.length > 0) {
      resolvedGroups.push({
        groupName: "Other Identified Items",
        suitability: "Uncategorized",
        pros: "",
        cons: "",
        topConcernNutrient: "calories",
        keyDifferentiator: "Items present in the photo but not explicitly analyzed.",
        averageNutrients: null,
        scoutItemIndices: missing.map((_, i) => i + scoutItems.length - missing.length), // wait, this is wrong, we need actual indices
"""

# wait, I will just manually edit the second part.
with open('server.ts', 'w') as f:
    f.write(content)

