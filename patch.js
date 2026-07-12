const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
code = code.replace(
  /const saveTimeoutRef = useRef<NodeJS\.Timeout \| null>\(null\);\n\n  const debouncedSaveConversation = \(id: string, msgs: ChatMessage\[\], payload: any\) => \{\n    if \(saveTimeoutRef\.current\) clearTimeout\(saveTimeoutRef\.current\);\n    saveTimeoutRef\.current = setTimeout\(\(\) => \{\n      saveConversationToFirestore\(id, msgs, payload\);\n    \}, 800\);\n  \};\n\n  useEffect\(\(\) => \{\n    return \(\) => \{\n      if \(saveTimeoutRef\.current\) \{\n        clearTimeout\(saveTimeoutRef\.current\);\n        \/\/ We can't easily capture the final state without refs, but we do our best.\n      \}\n    \};\n  \}, \[\]\);/g,
  `const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<(() => void) | null>(null);

  const debouncedSaveConversation = (id: string, msgs: ChatMessage[], payload: any) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    pendingSaveRef.current = () => saveConversationToFirestore(id, msgs, payload);
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        pendingSaveRef.current();
        pendingSaveRef.current = null;
      }
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (pendingSaveRef.current) {
        pendingSaveRef.current();
        pendingSaveRef.current = null;
      }
    };
  }, []);`
);
fs.writeFileSync('src/components/LogChat.tsx', code);
