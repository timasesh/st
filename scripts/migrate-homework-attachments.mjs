import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY before migrating homework files.');

const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, '.data'));
const sourcePath = path.join(dataDir, 'homework-attachments.json');
let attachments;
try { attachments = JSON.parse(await fs.readFile(sourcePath, 'utf8')); }
catch (error) {
  if (error.code === 'ENOENT') {
    console.log(`No legacy homework file found at ${sourcePath}; nothing to migrate.`);
    process.exit(0);
  }
  throw error;
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
let migrated = 0;
for (const [keyName, file] of Object.entries(attachments)) {
  const separator = keyName.indexOf(':');
  const studentId = keyName.slice(0, separator);
  const entryId = keyName.slice(separator + 1);
  if (separator < 1 || !studentId || !entryId || !file?.data || !file?.filename || !file?.mimeType) throw new Error(`Invalid legacy attachment record: ${keyName}`);
  const bytes = Buffer.from(file.data, 'base64');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error(`Attachment ${keyName} is empty or exceeds 5 MB.`);
  const objectPath = `${studentId}/${entryId}`;
  const upload = await supabase.storage.from('homework-attachments').upload(objectPath, bytes, { contentType: file.mimeType, upsert: true });
  if (upload.error) throw new Error(`Could not upload ${keyName}: ${upload.error.message}`);
  const metadata = await supabase.from('homework_attachments').upsert({
    student_id: studentId,
    entry_id: entryId,
    filename: file.filename.split(/[\\/]/).pop().slice(0, 180),
    mime_type: file.mimeType,
    updated_at: file.updatedAt || new Date().toISOString(),
  }, { onConflict: 'student_id,entry_id' });
  if (metadata.error) throw new Error(`Could not save metadata for ${keyName}: ${metadata.error.message}`);
  migrated += 1;
}

console.log(`Migrated ${migrated} homework attachment(s). The original JSON file was left unchanged.`);
