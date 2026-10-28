import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Общий чанк с этим модулем подгружает и Telegram-приложение (tg.html): там лендинг монтировать нельзя.
const rootElement = document.getElementById('root')!;
if (!rootElement.hasAttribute('data-tg')) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
