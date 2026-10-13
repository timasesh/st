import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const FILE_SIGNATURES = {
  'application/pdf': (bytes) => bytes.subarray(0, 5).toString('ascii') === '%PDF-',
  'image/jpeg': (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (bytes) => bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP',
};
const MIME_EXTENSIONS = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export function validateHomeworkUpload({ filename, mimeType, data }) {
  if (typeof filename !== 'string' || !filename.trim() || filename.length > 180 || !FILE_SIGNATURES[mimeType] || typeof data !== 'string' || data.length > 7_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new TypeError('Прикрепите PDF или изображение размером до 5 МБ.');
  }
  const buffer = Buffer.from(data, 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new TypeError('Размер файла должен быть не больше 5 МБ.');
  if (!FILE_SIGNATURES[mimeType](buffer)) throw new TypeError('Формат файла не совпадает с его содержимым. Выберите PDF или изображение JPG, PNG либо WEBP.');
  const safeFilename = filename.trim().split(/[\\/]/).pop().slice(0, 180);
  if (!MIME_EXTENSIONS[mimeType].includes(safeFilename.toLowerCase().slice(safeFilename.lastIndexOf('.')))) throw new TypeError('Расширение имени файла не совпадает с его форматом.');
  return { filename: safeFilename, mimeType, data, buffer };
}

export async function writeJsonAtomically(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}
