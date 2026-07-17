import re

with open('src/components/chat-cards/FoodCard.tsx', 'r') as f:
    code = f.read()

pattern = r"\{/\* Aggregated Nutrients - Shows ALL available nutrients \*/\}[\s\S]*?<\/div>"

new_code = "<AverageNutrientsTable averageNutrients={group.averageNutrients} profileLanguage={profile?.language || 'en'} />"

code = re.sub(pattern, new_code, code)

with open('src/components/chat-cards/FoodCard.tsx', 'w') as f:
    f.write(code)
