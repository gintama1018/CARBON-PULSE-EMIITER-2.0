---
name: AI-generated escaped backticks in JSX
description: Design subagents sometimes write \` instead of ` in template literals; sed fails, use Python
---

Design subagents (and other AI code generators) sometimes produce files where template literal backticks are escaped: `` \` `` and `\${` instead of `` ` `` and `${`. This breaks Babel/esbuild JSX parsing.

**Why:** The AI writes to files through a tool that escapes backticks to avoid breaking prompt boundaries.

**How to apply:** After receiving design subagent output, scan all TSX/TS files with Python:

```python
for path in glob.glob('src/**/*.tsx', recursive=True):
    with open(path, 'r') as f: content = f.read()
    if chr(92) + chr(96) in content or chr(92) + chr(36) + '{' in content:
        fixed = content.replace(chr(92)+chr(96), chr(96)).replace(chr(92)+chr(36)+'{', chr(36)+'{')
        with open(path, 'w') as f: f.write(fixed)
```

`sed -i 's/\\`/`/g'` does NOT work reliably for this (shell escaping issues).
