import fs from 'fs';
const filepath = 'apps/frontend/src/pages/index.astro';
let content = fs.readFileSync(filepath, 'utf8');
content = content.replace("import { getSortedSignals }", "import { getSortedSignals, getLatestMirror }");
content = content.replace("const { getLatestMirror } = await import('../db-local/sorting');", "");
fs.writeFileSync(filepath, content);
