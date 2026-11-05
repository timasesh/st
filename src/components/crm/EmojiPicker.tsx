import { useEffect, useRef, useState } from 'react';

/* Выбор смайликов как в WhatsApp: вкладки-категории и сетка. Первыми — фирменные 💙 и 😊. */
const GROUPS: { id: string; icon: string; title: string; list: string }[] = [
  { id: 'fav', icon: '💙', title: 'Study Task', list: '💙 😊 👋 🙏 ✅ 📚 ✏️ 📝 🎓 ⭐ 🌟 🔥 👍 🤝 📞 📅 ⏰ 💬 ➕ ➗ ✖️ ➖ 🧮 📐 📏' },
  { id: 'smile', icon: '😀', title: 'Смайлы', list: '😀 😃 😄 😁 😆 😅 😂 🤣 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 😜 🤗 🤔 🤨 😐 😌 😴 😎 🤓 🥳 😢 😭 😮 😳 🥺 😤 😡 🙄' },
  { id: 'hands', icon: '👍', title: 'Жесты', list: '👍 👎 👌 ✌️ 🤞 🤟 👏 🙌 🙏 🤝 💪 👋 ✋ 🖐️ 👆 👇 👉 👈 ☝️ ✍️' },
  { id: 'hearts', icon: '❤️', title: 'Сердца', list: '💙 ❤️ 🧡 💛 💚 💜 🖤 🤍 💖 💗 💓 💞 💕 ❣️ 💯 ✨ 🎉 🎊 🎁 🏆' },
  { id: 'school', icon: '🎓', title: 'Учёба', list: '🎓 📚 📖 📝 ✏️ 🖊️ 📐 📏 🧮 🔢 💡 🧠 🏫 🎒 📅 ⏰ 📞 💻 📱 ✅ ❓ ❗ 📍 🔗' },
];

export function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const [group, setGroup] = useState('fav');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const out = (event: MouseEvent) => { if (box.current && !box.current.contains(event.target as Node)) onClose(); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', out); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', key); };
  }, [onClose]);
  const current = GROUPS.find((g) => g.id === group) || GROUPS[0];
  return (
    <div className="crm-card crm-emoji" ref={box} role="dialog" aria-label="Смайлики">
      <div className="crm-emoji-tabs">
        {GROUPS.map((g) => <button key={g.id} type="button" title={g.title} aria-pressed={g.id === group} onClick={() => setGroup(g.id)}>{g.icon}</button>)}
      </div>
      <p className="crm-emoji-title">{current.title}</p>
      <div className="crm-emoji-grid">
        {current.list.split(' ').map((e) => <button key={e} type="button" onClick={() => onPick(e)}>{e}</button>)}
      </div>
    </div>
  );
}
