import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TgApp from './TgApp';
import './tg.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TgApp />
  </StrictMode>,
);
