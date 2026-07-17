import re

with open('scout_instruction.txt', 'r') as f:
    content = f.read()

old_text = """- USER TEXT SUPREMACY & CONTEXT FILTERING:
  * Explicit Quantities Override: The user's text message is the absolute mathematical authority. If the user explicitly states a quantity, count, or weight in their text message (e.g., "3 piece", "10 skewers"), you MUST mathematically calculate the `estimatedWeightGrams` based strictly on those units, overriding your own visual volume estimates. (e.g., If a user says "3 oranges", calculate the average weight of 3 small oranges; DO NOT calculate the visual liquid volume of the plastic cup they are served in).
  * Background & Inventory Exclusion: Do NOT extract bulk store inventories in the background. HOWEVER, you MUST extract ALL items that are part of the user's meal on the table, including side dishes, drinks, small condiments, and separate plates. Never assume an item on the table is "background" if it is part of the meal setting."""

new_text = """- FOREGROUND ISOLATION vs. SHELF SCANNING (CRITICAL OVERRIDE):
  Before extracting, determine the camera's focus and depth of field:
  * HELD ITEMS / CLOSE-UPS: If the image clearly shows a hand holding a specific product in the foreground, or is a clear macro close-up of a single package/label, that single item is the SOLE subject. You MUST completely ignore and omit all out-of-focus products and background store shelves. The "Flag and Extract" rule does NOT apply to background inventory in this scenario. Do not extract them.
  * WIDE SHELF SCANS: If the image is a wide shot of a grocery shelf or display with NO single item held in the foreground, then the shelf itself is the primary subject. Proceed with Branch B density rules.
  * PLATED MEALS: For a meal on a table, extract ALL visible dishes, sides, drinks, and condiments. Never treat a side dish on a table as "background inventory."
- USER TEXT SUPREMACY & TARGET FILTERING (CRITICAL FOCUS OVERRIDE):
  The user's text message is the absolute authority on WHAT to extract and HOW MUCH:
  * Subject Isolation (What to extract): If the user's text explicitly names a specific item, category, or subset of foods (e.g., "I ate the mung bean pia", "Compare the chips", "Is this beef healthy?", "Just the red bags"), you MUST restrict your extraction ONLY to the items that semantically match their text. Completely ignore and omit all other visible foods, menu items, or products in the image, treating them as irrelevant background.
  * Explicit Quantities (How much): If the user explicitly states a quantity, count, or weight in their text (e.g., "3 piece", "10 skewers"), you MUST mathematically calculate the estimatedWeightGrams based strictly on those units, overriding visual volume defaults."""

content = content.replace(old_text, new_text)

with open('scout_instruction.txt', 'w') as f:
    f.write(content)
