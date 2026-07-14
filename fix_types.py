import re

with open('src/components/chat-cards/types.ts', 'r') as f:
    content = f.read()

content = content.replace("setActiveInstructionPrompt?: (prompt: string | null) => void;", "setActiveInstructionPrompt?: (prompt: string | null) => void;\n  onDeleteMessage?: (id: string) => void;")

with open('src/components/chat-cards/types.ts', 'w') as f:
    f.write(content)

