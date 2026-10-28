import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const isAdmin = window.location.pathname.startsWith('/tg/admin');
const root = createRoot(document.getElementById('root')!);

// Стили подключаются по месту: ученическое мини-приложение — «доска» (tg.css), админ-панель — как на сайте (index.css).
if (isAdmin) {
  Promise.all([import('../index.css'), import('./TgAdmin')]).then(([, { default: TgAdmin }]) => {
    root.render(<StrictMode><TgAdmin /></StrictMode>);
  });
} else {
  Promise.all([import('./tg.css'), import('./TgApp')]).then(([, { default: TgApp }]) => {
    root.render(<StrictMode><TgApp /></StrictMode>);
  });
}
