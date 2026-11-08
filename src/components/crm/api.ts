export const CRM_LOCKED_EVENT = 'crm-locked';
export const CRM_UNLOCKED_EVENT = 'crm-unlocked';

export async function crmApi<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`/api/admin/crm${path}`, {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    credentials: 'same-origin',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  /* 423 = PIN-сеанс закончился: оболочка CRM сразу покажет экран ввода PIN-кода */
  if (response.status === 423) window.dispatchEvent(new Event(CRM_LOCKED_EVENT));
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data && data.error) || `Ошибка ${response.status}`);
  return data as T;
}

/* Скачать файл (Excel) POST-запросом: возвращает Blob и имя файла из заголовка */
export async function crmDownload(path: string, body: unknown): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`/api/admin/crm${path}`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (response.status === 423) window.dispatchEvent(new Event(CRM_LOCKED_EVENT));
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error((data && data.error) || `Ошибка ${response.status}`);
  }
  const disposition = response.headers.get('Content-Disposition') || '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plain = /filename="([^"]+)"/i.exec(disposition)?.[1];
  let filename = plain || 'leads.xlsx';
  if (encoded) { try { filename = decodeURIComponent(encoded); } catch { /* оставляем простое имя */ } }
  return { blob: await response.blob(), filename };
}
