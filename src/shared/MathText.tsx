import { Fragment, type CSSProperties, type ReactNode } from 'react';

// Рендер математической разметки в тестах (сайт и Telegram-мини-приложение).
// Поддерживается: \frac{a}{b} (настоящая дробь с чертой), ^{..}/^x, _{..}/_x, \sqrt{..},
// символы (\cdot, \times, \div, \le, \ge, \ne, \pi, \circ ...), а также цифровые «3/4» превращаются в дробь.
// Стили встроенные, чтобы компонент одинаково работал и в Tailwind-сайте, и в tg.css.

const SYMBOLS: Record<string, string> = {
  cdot: '·', times: '×', div: ':', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', pi: 'π', circ: '°', degree: '°',
  approx: '≈', pm: '±', alpha: 'α', beta: 'β', gamma: 'γ', angle: '∠', triangle: '△', perp: '⊥', parallel: '∥', infty: '∞',
  to: '→', ldots: '…', quad: ' ', ',': ' ', ' ': ' ', '%': '%', '$': '$', '{': '{', '}': '}', '\\': '\n',
};

function readGroup(s: string, i: number): [string, number] {
  // s[i] === '{'; возвращает содержимое и индекс после закрывающей скобки
  let depth = 0;
  for (let j = i; j < s.length; j += 1) {
    if (s[j] === '{') depth += 1;
    else if (s[j] === '}') { depth -= 1; if (depth === 0) return [s.slice(i + 1, j), j + 1]; }
  }
  return [s.slice(i + 1), s.length];
}

function plain(text: string, key: string): ReactNode[] {
  // «3/4» → дробь, если это отдельные числа (не даты и не 12/05/2024)
  const out: ReactNode[] = [];
  const re = /(?<![\d/.,])(\d{1,4})\/(\d{1,4})(?![\d/])/g;
  let last = 0; let m: RegExpExecArray | null; let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<Fragment key={`${key}-f${n++}`}><Frac num={m[1]} den={m[2]} /></Fragment>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Frac({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span role="math" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 0.14em', lineHeight: 1.2, textAlign: 'center', fontSize: '0.95em' }}>
      <span style={{ display: 'block', padding: '0 0.25em 0.04em', borderBottom: '0.09em solid currentColor' }}>{num}</span>
      <span style={{ display: 'block', padding: '0.04em 0.25em 0' }}>{den}</span>
    </span>
  );
}

function parse(s: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let buf = ''; let n = 0; let i = 0;
  const flush = () => { if (buf) { out.push(...plain(buf, `${key}-t${n++}`)); buf = ''; } };
  while (i < s.length) {
    const c = s[i];
    if (c === '$') { i += 1; continue; }
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i));
      if (!m) { i += 1; continue; }
      const cmd = m[1]; i += m[0].length;
      if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
        while (s[i] === ' ') i += 1;
        let a = ''; let b = '';
        if (s[i] === '{') { [a, i] = readGroup(s, i); }
        while (s[i] === ' ') i += 1;
        if (s[i] === '{') { [b, i] = readGroup(s, i); }
        flush(); out.push(<Fragment key={`${key}-fr${n++}`}><Frac num={parse(a, `${key}-n${n}`)} den={parse(b, `${key}-d${n}`)} /></Fragment>);
      } else if (cmd === 'sqrt') {
        let a = '';
        if (s[i] === '{') { [a, i] = readGroup(s, i); }
        flush(); out.push(<span key={`${key}-sq${n++}`} style={{ whiteSpace: 'nowrap' }}>√<span style={{ borderTop: '0.09em solid currentColor', padding: '0.02em 0.05em 0' }}>{parse(a, `${key}-r${n}`)}</span></span>);
      } else if (cmd === 'text' || cmd === 'mathrm' || cmd === 'left' || cmd === 'right') {
        if (s[i] === '{') { let a = ''; [a, i] = readGroup(s, i); buf += a; }
      } else if (cmd in SYMBOLS) buf += SYMBOLS[cmd];
      else buf += cmd;
      continue;
    }
    if (c === '^' || c === '_') {
      i += 1; let a = '';
      if (s[i] === '{') { [a, i] = readGroup(s, i); } else if (i < s.length) { a = s[i]; i += 1; }
      flush();
      const Tag = c === '^' ? 'sup' : 'sub';
      out.push(<Tag key={`${key}-s${n++}`} style={{ fontSize: '0.72em', lineHeight: 0 }}>{parse(a, `${key}-x${n}`)}</Tag>);
      continue;
    }
    if (c === '{' || c === '}') { i += 1; continue; }
    buf += c; i += 1;
  }
  flush();
  return out;
}

export default function MathText({ text, className, style }: { text: string; className?: string; style?: CSSProperties }) {
  return <span className={className} style={{ whiteSpace: 'pre-wrap', ...style }}>{parse(String(text ?? ''), 'm').map((node, i) => <Fragment key={i}>{node}</Fragment>)}</span>;
}

/** Рисунок к вопросу: SVG из теста показывается через <img data:>, скрипты в таком режиме не выполняются. */
export function QuestionFigure({ figure, maxHeight = 260 }: { figure?: string | null; maxHeight?: number }) {
  if (!figure || !figure.trim().startsWith('<svg')) return null;
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(figure)}`;
  return <img src={src} alt="Рисунок к вопросу" style={{ display: 'block', maxWidth: '100%', maxHeight, margin: '10px auto 4px', background: '#fff', borderRadius: 12, border: '1px solid rgba(100,116,139,.35)' }} />;
}
