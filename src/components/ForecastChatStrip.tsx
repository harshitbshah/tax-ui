interface Props {
  onOpenChat: () => void;
}

export function ForecastChatStrip({ onOpenChat }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-(--color-border) bg-(--color-bg) px-5 py-4">
      <span className="text-lg">💬</span>
      <p className="flex-1 text-xs text-(--color-text-muted)">
        <span className="font-medium text-(--color-text)">Ask Claude about this forecast</span>
        {" — "}
        &ldquo;What if I sell my NVDA?&rdquo; · &ldquo;What if no bonus?&rdquo; · &ldquo;Walk me
        through Q3 actions&rdquo;
      </p>
      <button
        onClick={onOpenChat}
        className="shrink-0 cursor-pointer rounded-md bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
      >
        Open chat →
      </button>
    </div>
  );
}
