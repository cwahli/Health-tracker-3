import re

with open('server.ts', 'r') as f:
    content = f.read()

new_missing = """
      resolvedGroups.push({
        groupName: "Other Identified Items",
        suitability: "Uncategorized",
        pros: "",
        cons: "These items were detected but not placed into a comparison group by the AI.",
        topConcernNutrient: null,
        keyDifferentiator: null,
        averageNutrients: null,
        scoutItemIndices: scoutItems.map((_, i) => i).filter(i => !usedIndices.has(i)),
        items: missing.flatMap((s: any) => explodeScoutItemIntoDishItems(s))
      });
"""

pattern = r"      resolvedGroups\.push\(\{\n        groupName: \"Other Identified Items\",[\s\S]*?items: missing\.flatMap\(\(s: any\) => explodeScoutItemIntoDishItems\(s\)\)\n      \}\);"

if re.search(pattern, content):
    content = re.sub(pattern, new_missing.strip(), content)
else:
    print("Pattern 2 not found!")

with open('server.ts', 'w') as f:
    f.write(content)

