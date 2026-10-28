import { ChangeEvent, ClipboardEvent, CSSProperties, useLayoutEffect, useRef } from 'react';
import { nationalDigits, phoneProblem, prefixOk, renderPhone } from './phone';

/* Поле телефона с маской «+7 (___) ___ __ __». «+7» убрать нельзя; цифры заполняют места по порядку. */
type Props = {
  value: string; // 10 цифр без +7
  onChange: (digits: string) => void;
  className?: string;
  style?: CSSProperties;
  invalid?: boolean;
  autoFocus?: boolean;
  id?: string;
};

export default function PhoneInput({ value, onChange, className, style, invalid, autoFocus, id }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const { text, caret } = renderPhone(value);
  const bad = invalid ?? Boolean(phoneProblem(value, false));

  const placeCaret = () => {
    const el = ref.current;
    if (el && document.activeElement === el) el.setSelectionRange(caret, caret);
  };
  useLayoutEffect(placeCaret, [text, caret]);

  const handle = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const type = (event.nativeEvent as InputEvent).inputType || '';
    const body = raw.startsWith('+7') ? raw.slice(2) : raw; // «+7» маски не считается цифрой номера
    const found = nationalDigits(body);
    const data = (event.nativeEvent as InputEvent).data || '';
    let next = found;
    if (type === 'insertText' && data.length === 1) {
      // набор всегда дописывает цифру в конец; буквы/символы и лишние цифры игнорируются
      if (!/^\d$/.test(data)) next = value;
      else if (found.length === value.length + 1) next = value + data;
      else if (found.length < value.length) next = found; // выделили всё и заменили
      else next = value;
    } else if (type.startsWith('delete') && found.length >= value.length) {
      next = value.slice(0, -1); // стёрли «знак маски» — убираем последнюю цифру
    }
    onChange(next);
    // если значение не изменилось, React не перерисует — вернём курсор вручную
    requestAnimationFrame(placeCaret);
  };

  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    onChange(nationalDigits(event.clipboardData.getData('text')));
  };

  return (
    <>
    <input
      ref={ref}
      id={id}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      autoFocus={autoFocus}
      value={text}
      onChange={handle}
      onPaste={paste}
      onFocus={() => requestAnimationFrame(placeCaret)}
      onClick={placeCaret}
      aria-invalid={bad}
      className={className}
      style={bad ? { ...style, borderColor: '#e11d48' } : style}
    />
    {!prefixOk(value) && <p role="alert" style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: '#e11d48' }}>{phoneProblem(value, false)}</p>}
    </>
  );
}
