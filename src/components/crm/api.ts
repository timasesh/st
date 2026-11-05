export async function crmApi<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`/api/admin/crm${path}`, {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    credentials: 'same-origin',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data && data.error) || `Ошибка ${response.status}`);
  return data as T;
}
