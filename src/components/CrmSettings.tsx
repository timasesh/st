import { useEffect, useState } from 'react';
import { Copy, Download, KeyRound, LockKeyhole, MousePointerClick, ShieldCheck, Trash2, Users } from 'lucide-react';
import { lockCrm } from './CrmGate';

/* «Настройка CRM»: открывается после ввода PIN-кода (CrmGate). Здесь собраны защита доступа и подсказки по массовой работе с заявками. */
export default function CrmSettings({ onOpenLeads }: { onOpenLeads: () => void }) {
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    fetch('/api/admin/crm-access/status', { credentials: 'same-origin' }).then((r) => r.json()).then((b: { expiresAt?: number }) => setExpiresAt(b.expiresAt || 0)).catch(() => undefined);
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const minutes = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 60000)) : 0;
  const left = minutes >= 60 ? `${Math.floor(minutes / 60)} ч ${minutes % 60} мин` : `${minutes} мин`;

  return (
    <div className="grid max-w-3xl gap-6">
      <section className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-extrabold">Защита доступа</h2><p className="text-sm text-muted">Вкладки «CRM» и «Настройка CRM» открываются по PIN-коду.</p></div></div>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex gap-2"><KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Код тот же, что у «Управления данными» (переменная <code>ADMIN_CLEANUP_PIN</code> на Render).</li>
          <li className="flex gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Один ввод открывает обе вкладки. Сеанс длится 8 часов (переменная <code>CRM_ACCESS_MINUTES</code>), потом код спросят снова.</li>
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Без кода сервер не отдаёт ни заявки, ни чаты, ни задачи, а всплывающие уведомления CRM на время блокировки молчат.</li>
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <span className="text-sm"><strong className="block">Доступ открыт</strong><span className="text-muted">{expiresAt ? `Закроется примерно через ${left}` : 'Проверяем срок сеанса…'}</span></span>
          <button type="button" onClick={() => void lockCrm()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold text-muted hover:bg-primary-light hover:text-primary"><LockKeyhole className="h-4 w-4" /> Закрыть доступ сейчас</button>
        </div>
      </section>

      <section className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-rose-50 p-2.5 text-rose-700"><Trash2 className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-extrabold">Чистка заявок и повторов</h2><p className="text-sm text-muted">Сначала выбор, потом действие.</p></div></div>
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-white">1</span><span>Откройте «CRM → Заявки» и нажмите <b>«Выбрать»</b> — карточки получат галочки. Ничего не удаляется, пока вы не выберете действие.</span></li>
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-white">2</span><span>Отметьте заявки кликом (или <b>«Выбрать все»</b>). Кнопка <b>«Отметить повторы»</b> сама отмечает лишние заявки с одинаковым телефоном: остаётся та, у которой самый продвинутый статус, при равенстве — самая старая. Выбор можно поправить вручную.</span></li>
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-white">3</span><span>Внизу появится панель действий: <b>«Скачать Excel»</b> (файл .xlsx с выбранными заявками) или <b>«Удалить»</b> (с подтверждением и возможностью сначала скачать копию).</span></li>
        </ol>
        <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          <p className="flex gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0" /> Удаляются только заявки: контакты, переписка и данные учеников остаются.</p>
          <p className="flex gap-2"><Copy className="mt-0.5 h-4 w-4 shrink-0" /> Удалённая заявка не появится снова при обновлении пробных уроков или импорте старых данных.</p>
          <p className="flex gap-2"><Download className="mt-0.5 h-4 w-4 shrink-0" /> Действия применяются только к тем отмеченным заявкам, которые видны при текущих фильтрах.</p>
        </div>
        <button type="button" onClick={onOpenLeads} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700"><MousePointerClick className="h-4 w-4" /> Открыть заявки</button>
      </section>
    </div>
  );
}
