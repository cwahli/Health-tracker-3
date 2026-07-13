const fs = require('fs');

let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

const migrationFunc = `  const migrateMessages = (msgs: any[]) => msgs.map(msg => {
    const newMsg = { ...msg };
    if (!newMsg.data) {
      newMsg.data = {};
      const legacyFields = ['pendingFoodLog', 'pendingFoodIdeas', 'pendingBiomarkers', 'pendingBiomarkerEntries', 'pendingCustomBiomarkerDefs', 'proposal', 'bucketMapping', 'agentResult'];
      legacyFields.forEach(f => {
        if (newMsg[f] !== undefined) {
          newMsg.data[f] = newMsg[f];
          delete newMsg[f];
        }
      });
    }
    return newMsg;
  });`;

// insert it right before loadConversationsFromFirestore
code = code.replace(/  const loadConversationsFromFirestore = async \(\) => \{/, migrationFunc + '\n\n  const loadConversationsFromFirestore = async () => {');

// now update the setMessages calls
code = code.replace(/setMessages\(parsed\);/, 'setMessages(migrateMessages(parsed));');
code = code.replace(/setMessages\(match\.messages \|\| \[\]\);/, 'setMessages(migrateMessages(match.messages || []));');

fs.writeFileSync('src/components/LogChat.tsx', code);
