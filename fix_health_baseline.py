import re

with open('src/components/chat-cards/HealthBaselineCard.tsx', 'r') as f:
    content = f.read()

# Update handleDismiss to call onDeleteMessage
replacement = """  const handleDismiss = () => {
    if (onDeleteMessage) {
      onDeleteMessage(msg.id);
    } else {
      setLoggedMessageIds?.(prev => [...prev, msg.id]);
    }
  };"""

content = re.sub(r'  const handleDismiss = \(\) => \{\n.*?setLoggedMessageIds\?\.\(prev => \[\.\.\.prev, msg\.id\]\);\n  \};', replacement, content, flags=re.DOTALL)

with open('src/components/chat-cards/HealthBaselineCard.tsx', 'w') as f:
    f.write(content)

