import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# First, remove the previous safeGet and safeSet definitions
content = re.sub(r'const safeGet = async.*?};', '', content, flags=re.DOTALL)
content = re.sub(r'const safeSet = async.*?};', '', content, flags=re.DOTALL)

# Revert safeGet / safeSet to get / set everywhere, just to be sure we don't leave any
content = re.sub(r'\bsafeGet\(', 'get(', content)
content = re.sub(r'\bsafeSet\(', 'set(', content)

# Now, replace the import statement
content = content.replace("import { get, set } from 'idb-keyval';", "import { get as idbGet, set as idbSet } from 'idb-keyval';\n\nconst get = async (key: string): Promise<any> => {\n  try {\n    return await Promise.race([\n      idbGet(key),\n      new Promise((_, reject) => setTimeout(() => reject(new Error(\"IndexedDB timeout\")), 1500))\n    ]);\n  } catch (e) {\n    console.warn(\"get timeout/error:\", e);\n    const val = localStorage.getItem(key);\n    return val ? JSON.parse(val) : undefined;\n  }\n};\n\nconst set = async (key: string, val: any): Promise<void> => {\n  try {\n    localStorage.setItem(key, JSON.stringify(val));\n    await Promise.race([\n      idbSet(key, val),\n      new Promise((_, reject) => setTimeout(() => reject(new Error(\"IndexedDB timeout\")), 1500))\n    ]);\n  } catch (e) {\n    console.warn(\"set timeout/error:\", e);\n  }\n};\n")

with open('src/App.tsx', 'w') as f:
    f.write(content)
