export function ForecastView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-(--color-text-muted)">
      <span className="text-3xl">🔮</span>
      <p className="text-sm font-medium">AI Forecast — coming soon</p>
      <p className="max-w-xs text-center text-xs">
        Claude will reason over your full tax history to project next year's liability and surface
        action items.
      </p>
    </div>
  );
}
