import re

with open('src/components/chat-cards/FoodCard.tsx', 'r') as f:
    code = f.read()

pattern = r"\{activeScoutItems\.some\(\(i: any\) => \(i\.nutritionFacts && Object\.keys\(i\.nutritionFacts\)\.length > 0\) \|\| \(i\.rawNutritionLabel && Object\.keys\(i\.rawNutritionLabel\)\.length > 0\)\) && \([\s\S]*?<\/div>\n                             \)}"

new_code = re.sub(pattern, "<NutritionLabelTable activeScoutItems={activeScoutItems} />", code)

with open('src/components/chat-cards/FoodCard.tsx', 'w') as f:
    f.write(new_code)
