import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace import
content = content.replace("import { get, set } from 'idb-keyval';", "import { get, set } from 'idb-keyval';\n\nconst safeGet = async (key: string): Promise<any> => {\n  try {\n    return await Promise.race([\n      get(key),\n      new Promise((_, reject) => setTimeout(() => reject(new Error(\"IndexedDB timeout\")), 1500))\n    ]);\n  } catch (e) {\n    console.warn(\"safeGet timeout/error:\", e);\n    const val = localStorage.getItem(key);\n    return val ? JSON.parse(val) : undefined;\n  }\n};\n\nconst safeSet = async (key: string, val: any): Promise<void> => {\n  try {\n    localStorage.setItem(key, JSON.stringify(val));\n    await Promise.race([\n      set(key, val),\n      new Promise((_, reject) => setTimeout(() => reject(new Error(\"IndexedDB timeout\")), 1500))\n    ]);\n  } catch (e) {\n    console.warn(\"safeSet timeout/error:\", e);\n  }\n};\n")

# Replace calls
content = re.sub(r'\bget\s*\(', 'safeGet(', content)
content = re.sub(r'\bset\s*\(', 'safeSet(', content)

# But wait, we imported 'get' and 'set' from 'idb-keyval'. We must not replace the import itself again.
content = content.replace("import { safeGet, safeSet } from 'idb-keyval';", "import { get, set } from 'idb-keyval';")

# Wait, `get` and `set` might be used as property names or state setters?
# Let's be careful. `await get(` and `await set(` are safe.
