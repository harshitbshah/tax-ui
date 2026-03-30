import { useState } from "react";

import type { ForecastState } from "../App";
import { getUsConstants } from "../lib/constants";
import type { ForecastProfile } from "../lib/forecast-profile-schema";
import {
  confidenceLevel,
  countFilledFields,
  TOTAL_PROFILE_FIELDS,
} from "../lib/forecast-profile-schema";
import { formatAmount, formatPercent } from "../lib/format";
import { ActionItemsCard } from "./ActionItemsCard";
import { AssumptionsCard } from "./AssumptionsCard";
import { BracketBar } from "./BracketBar";
import { ForecastChatStrip } from "./ForecastChatStrip";
import { ForecastProfilePanel } from "./ForecastProfilePanel";
import { IndiaRegimeCard } from "./IndiaRegimeCard";
import { RiskFlags } from "./RiskFlags";

interface Props {
  returns: Record<number, unknown>;
  forecastState: ForecastState;
  onGenerate: (regenerate?: boolean) => void;
  onToggleChat?: () => void;
  activeCountry: string;
  currency: string;
  forecastProfile: ForecastProfile | null;
  onSaveProfile: (profile: ForecastProfile) => Promise<void>;
}

function MetricCard({
  label,
  value,
  range,
  badge,
}: {
  label: string;
  value: string;
  range: string;
  badge?: { text: string; color: "green" | "amber" | "neutral" };
}) {
  const badgeColors = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    neutral: "bg-(--color-bg-muted) text-(--color-text-muted)",
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-(--color-border) bg-(--color-bg) p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest text-(--color-text-muted) uppercase">
          {label}
        </span>
        {badge && (
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-medium ${badgeColors[badge.color]}`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold text-(--color-text) tabular-nums">{value}</div>
      <div className="text-xs text-(--color-text-muted)">{range}</div>
    </div>
  );
}

function UsConstantsStatus({ years, warnOnly = false }: { years: number[]; warnOnly?: boolean }) {
  if (years.length === 0) return null;
  const visibleYears = warnOnly ? years.filter((y) => getUsConstants(y) === null) : years;
  if (visibleYears.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-(--color-text-muted)">
        {warnOnly ? "Missing IRS constants:" : "IRS constants:"}
      </span>
      {visibleYears.map((y) => {
        const verified = getUsConstants(y) !== null;
        return (
          <span
            key={y}
            className={
              verified
                ? "rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                : "rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
            }
          >
            {verified ? "✓" : "⚠"} {y}
          </span>
        );
      })}
    </div>
  );
}

function GeneratingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

const CONFIDENCE_CONFIG = {
  low: {
    dot: "bg-zinc-400",
    label: "Low confidence",
    description: "running on trend extrapolation",
    cta: "Add inputs to improve accuracy",
  },
  medium: {
    dot: "bg-amber-400",
    label: "Medium confidence",
    description: "some inputs provided",
    cta: "Add more inputs to narrow the range",
  },
  good: {
    dot: "bg-blue-400",
    label: "Good confidence",
    description: "most inputs provided",
    cta: "Add remaining inputs for high confidence",
  },
  high: {
    dot: "bg-emerald-500",
    label: "High confidence",
    description: "all inputs provided",
    cta: null,
  },
} as const;

function ConfidenceBanner({
  profile,
  isPanelOpen,
  onTogglePanel,
}: {
  profile: ForecastProfile | null;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const level = confidenceLevel(profile);
  const filled = countFilledFields(profile);
  const cfg = CONFIDENCE_CONFIG[level];

  return (
    <div className="flex items-center justify-between rounded-lg border border-(--color-border) bg-(--color-bg-muted) px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
        <div className="text-xs text-(--color-text)">
          <span className="font-medium">{cfg.label}</span>
          {filled > 0 && (
            <span className="text-(--color-text-muted)">
              {" "}
              · {filled} of {TOTAL_PROFILE_FIELDS} inputs provided
            </span>
          )}
          {cfg.cta && <span className="text-(--color-text-muted)"> · {cfg.description}</span>}
        </div>
      </div>
      <button
        onClick={onTogglePanel}
        className="cursor-pointer rounded px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
      >
        {isPanelOpen ? "Close" : filled === 0 ? "+ Add inputs" : "Edit inputs"}
      </button>
    </div>
  );
}

export function ForecastView({
  returns,
  forecastState: state,
  onGenerate,
  onToggleChat,
  activeCountry,
  currency,
  forecastProfile,
  onSaveProfile,
}: Props) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const yearCount = Object.keys(returns).length;
  const historyYears = Object.keys(returns)
    .map(Number)
    .sort((a, b) => a - b);
  const projectedYear =
    historyYears.length > 0 ? Math.max(...historyYears) + 1 : new Date().getFullYear();
  const allForecastYears = projectedYear ? [...historyYears, projectedYear] : historyYears;
  const isUs = activeCountry === "us";

  const fmt = (v: number, showSign = false) => formatAmount(v, currency, showSign);

  async function handleSaveProfile(profile: ForecastProfile) {
    await onSaveProfile(profile);
    setIsPanelOpen(false);
    onGenerate(true);
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center text-(--color-text-muted)">
        <GeneratingDots />
      </div>
    );
  }

  if (state.status === "generating") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-(--color-text-muted)">
        <GeneratingDots />
        <p className="text-sm">Claude is analyzing {yearCount} years of tax history…</p>
        {isUs && <UsConstantsStatus years={allForecastYears} warnOnly />}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-(--color-text-muted)">
        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{state.message}</p>
        <button
          onClick={() => onGenerate()}
          className="cursor-pointer rounded-md border border-(--color-border) px-4 py-2 text-sm transition-colors hover:bg-(--color-bg-muted)"
        >
          Try again
        </button>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-(--color-text-muted)">
          <span className="text-4xl">🔮</span>
          <div className="text-center">
            <p className="text-sm font-medium text-(--color-text)">AI Tax Forecast</p>
            <p className="mt-1 max-w-xs text-xs">
              Claude will analyze your {yearCount} years of tax history and project next year&apos;s
              liability, surface action items, and flag risks.
            </p>
            {isUs && countFilledFields(forecastProfile) === 0 && (
              <p className="mt-1 max-w-xs text-xs text-(--color-text-muted)">
                Optionally{" "}
                <button
                  onClick={() => setIsPanelOpen(true)}
                  className="cursor-pointer text-indigo-600 underline dark:text-indigo-400"
                >
                  add {projectedYear} inputs
                </button>{" "}
                for a more accurate forecast.
              </p>
            )}
          </div>
          <button
            onClick={() => onGenerate()}
            className="cursor-pointer rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Generate Forecast →
          </button>
        </div>
        {isUs && isPanelOpen && (
          <ForecastProfilePanel
            profile={forecastProfile}
            projectedYear={projectedYear}
            onSave={handleSaveProfile}
            onClose={() => setIsPanelOpen(false)}
          />
        )}
      </div>
    );
  }

  // Loaded
  const { data } = state;
  const { taxLiability, effectiveRate, estimatedOutcome } = data;

  const outcomeSign = estimatedOutcome.value >= 0 ? "+" : "";
  const outcomeBadge =
    estimatedOutcome.label === "refund"
      ? { text: "Likely refund", color: "green" as const }
      : { text: "Likely owed", color: "amber" as const };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-4 p-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-(--color-text)">
                {data.projectedYear} Forecast
              </h1>
              <p className="mt-0.5 text-xs text-(--color-text-muted)">
                AI-generated from {yearCount} years of tax history · Powered by Claude Sonnet
              </p>
              {isUs && (
                <div className="mt-2">
                  <UsConstantsStatus years={[...historyYears, data.projectedYear]} warnOnly />
                </div>
              )}
            </div>
            <button
              onClick={() => onGenerate(true)}
              className="cursor-pointer rounded-md border border-(--color-border) px-3 py-1.5 text-xs text-(--color-text-muted) transition-colors hover:bg-(--color-bg-muted) hover:text-(--color-text)"
            >
              ⟳ Regenerate
            </button>
          </div>

          {/* Confidence banner — US only */}
          {isUs && (
            <ConfidenceBanner
              profile={forecastProfile}
              isPanelOpen={isPanelOpen}
              onTogglePanel={() => setIsPanelOpen((v) => !v)}
            />
          )}

          {/* Three metric cards */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="Projected Tax Liability"
              value={fmt(taxLiability.value)}
              range={`Range: ${fmt(taxLiability.low)} – ${fmt(taxLiability.high)}`}
              badge={isUs ? { text: "Federal + State", color: "neutral" } : undefined}
            />
            <MetricCard
              label="Effective Rate"
              value={formatPercent(effectiveRate.value)}
              range={`Range: ${formatPercent(effectiveRate.low)} – ${formatPercent(effectiveRate.high)}`}
            />
            <MetricCard
              label="Estimated Outcome"
              value={`${outcomeSign}${fmt(estimatedOutcome.value)}`}
              range={`Range: ${outcomeSign}${fmt(estimatedOutcome.low)} to ${fmt(estimatedOutcome.high)}`}
              badge={outcomeBadge}
            />
          </div>

          {/* Bracket bar — US filers only */}
          {data.bracket && <BracketBar {...data.bracket} />}

          {/* India regime — shown prominently when viewing India forecast */}
          {data.india && <IndiaRegimeCard india={data.india} />}

          {/* Assumptions + Action items */}
          <div className="grid grid-cols-2 gap-3">
            <AssumptionsCard assumptions={data.assumptions} />
            <ActionItemsCard actionItems={data.actionItems} />
          </div>

          {/* Risk flags */}
          {data.riskFlags.length > 0 && <RiskFlags riskFlags={data.riskFlags} />}

          {/* Chat strip */}
          <ForecastChatStrip onOpenChat={onToggleChat ?? (() => {})} />
        </div>
      </div>

      {/* Profile panel — slide in from right */}
      {isUs && isPanelOpen && (
        <ForecastProfilePanel
          profile={forecastProfile}
          projectedYear={projectedYear}
          onSave={handleSaveProfile}
          onClose={() => setIsPanelOpen(false)}
        />
      )}
    </div>
  );
}
