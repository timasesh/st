export default function SkyQuestLoginScene() {
  return <section aria-label="Sky Quest: автоматический полёт" className="login-skyquest relative h-[260px] overflow-hidden bg-slate-950 sm:h-[430px] lg:h-full lg:min-h-dvh">
    <iframe
      src="/flappy/index.html?loginDemo=1"
      title="Автоматический полёт в Sky Quest"
      tabIndex={-1}
      className="pointer-events-none absolute inset-0 h-full w-full border-0"
      aria-hidden="true"
      loading="eager"
    />
  </section>;
}
