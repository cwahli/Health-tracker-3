import re

with open('src/components/LogChat.tsx', 'r') as f:
    content = f.read()

replacement = """                        onAgentFinish={onAgentFinish}
                        handleSend={handleSend}
                        setActiveInstructionAgentType={setActiveInstructionAgentType}
                        setActiveInstructionPrompt={setActiveInstructionPrompt}
                        onDeleteMessage={(id) => setMessages(prev => prev.filter(m => m.id !== id))}"""

content = content.replace("""                        onAgentFinish={onAgentFinish}
                        handleSend={handleSend}
                        setActiveInstructionAgentType={setActiveInstructionAgentType}
                        setActiveInstructionPrompt={setActiveInstructionPrompt}""", replacement)

with open('src/components/LogChat.tsx', 'w') as f:
    f.write(content)

