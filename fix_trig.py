import re

with open('src/utils/biomarkers.ts', 'r') as f:
    content = f.read()

# For !isMmol, we will add triglycerides
if "key === 'triglycerides'" not in content:
    # let's add it right after apob
    content = content.replace("    if (key === 'apob') {\n      if (valueToEvaluate > 110) return 'critical';\n      if (valueToEvaluate > 90) return 'high';\n      return 'normal';\n    }", "    if (key === 'apob') {\n      if (valueToEvaluate > 110) return 'critical';\n      if (valueToEvaluate > 90) return 'high';\n      return 'normal';\n    }\n    if (key === 'triglycerides') {\n      if (valueToEvaluate >= 500) return 'critical';\n      if (valueToEvaluate >= 150) return 'high';\n      return 'normal';\n    }")

# Now for isMmol, we will add an else branch or just another block
if "if (isMmol) {" not in content:
    content = content.replace("if (!isMmol) {", "if (isMmol) {\n    if (key === 'triglycerides') {\n      if (valueToEvaluate > 5.6) return 'critical';\n      if (valueToEvaluate >= 1.7) return 'high';\n      return 'normal';\n    }\n  }\n  if (!isMmol) {")

with open('src/utils/biomarkers.ts', 'w') as f:
    f.write(content)
