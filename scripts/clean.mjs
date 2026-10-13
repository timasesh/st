import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
rmSync(path.join(projectRoot, 'dist'), { recursive: true, force: true });
