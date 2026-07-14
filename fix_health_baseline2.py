import re

with open('src/components/chat-cards/HealthBaselineCard.tsx', 'r') as f:
    content = f.read()

content = content.replace("  loggedMessageIds\n}) => {", "  loggedMessageIds,\n  onDeleteMessage\n}) => {")

with open('src/components/chat-cards/HealthBaselineCard.tsx', 'w') as f:
    f.write(content)

