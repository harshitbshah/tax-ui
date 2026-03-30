import { useEffect, useState } from "react";

import type { ForecastProfile } from "../lib/forecast-profile-schema";
import { Button } from "./Button";
import { XMarkIcon } from "./XMarkIcon";

interface Props {
  profile: ForecastProfile | null;
  projectedYear: number;
  onSave: (profile: ForecastProfile) => Promise<void>;
  onClose: () => void;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-semibold tracking-widest text-(--color-text-muted) uppercase">
      {children}
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1">
      <label className="text-xs font-medium text-(--color-text)">{children}</label>
      {hint && <p className="text-[11px] text-(--color-text-muted)">{hint}</p>}
    </div>
  );
}

function AmountInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-(--color-text-muted)">
        $
      </span>
      <input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        placeholder={placeholder ?? "0"}
        className="w-full rounded-lg border border-(--color-border) bg-(--color-bg-muted) py-2 pr-3 pl-6 text-sm focus:border-(--color-text-muted) focus:outline-none"
      />
    </div>
  );
}

function BonusRow({
  label,
  low,
  high,
  onLowChange,
  onHighChange,
}: {
  label: string;
  low: number | undefined;
  high: number | undefined;
  onLowChange: (v: number | undefined) => void;
  onHighChange: (v: number | undefined) => void;
}) {
  return (
    <div>
      <FieldLabel hint="Leave blank if unknown">{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <AmountInput value={low} onChange={onLowChange} placeholder="Low" />
        <span className="text-xs text-(--color-text-muted)">–</span>
        <AmountInput value={high} onChange={onHighChange} placeholder="High" />
      </div>
    </div>
  );
}

export function ForecastProfilePanel({ profile, projectedYear, onSave, onClose }: Props) {
  const [form, setForm] = useState<ForecastProfile>(profile ?? {});
  const [isSaving, setIsSaving] = useState(false);

  // Reinitialize if profile prop changes (e.g. country switch)
  useEffect(() => {
    setForm(profile ?? {});
  }, [profile]);

  function set<K extends keyof ForecastProfile>(key: K, value: ForecastProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function clear<K extends keyof ForecastProfile>(key: K) {
    setForm((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const annualizedWithholding =
    form.ytdWithholding != null && form.ytdMonth != null && form.ytdMonth > 0
      ? Math.round((form.ytdWithholding / form.ytdMonth) * 12)
      : null;

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(form);
    } finally {
      setIsSaving(false);
    }
  }

  function handleClear() {
    setForm({});
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-(--color-border) bg-(--color-bg)">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-(--color-text)">{projectedYear} Inputs</p>
          <p className="text-[11px] text-(--color-text-muted)">
            Each field replaces a Claude estimate with a real number
          </p>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer rounded p-1 text-(--color-text-muted) hover:bg-(--color-bg-muted) hover:text-(--color-text)"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Income */}
        <div>
          <SectionLabel>Income</SectionLabel>
          <div className="space-y-3">
            <div>
              <FieldLabel>Your base salary</FieldLabel>
              <AmountInput
                value={form.salary1}
                onChange={(v) => (v == null ? clear("salary1") : set("salary1", v))}
              />
            </div>
            <div>
              <FieldLabel>Spouse base salary</FieldLabel>
              <AmountInput
                value={form.salary2}
                onChange={(v) => (v == null ? clear("salary2") : set("salary2", v))}
              />
            </div>
            <BonusRow
              label="Your expected bonus"
              low={form.bonusLow1}
              high={form.bonusHigh1}
              onLowChange={(v) => (v == null ? clear("bonusLow1") : set("bonusLow1", v))}
              onHighChange={(v) => (v == null ? clear("bonusHigh1") : set("bonusHigh1", v))}
            />
            <BonusRow
              label="Spouse expected bonus"
              low={form.bonusLow2}
              high={form.bonusHigh2}
              onLowChange={(v) => (v == null ? clear("bonusLow2") : set("bonusLow2", v))}
              onHighChange={(v) => (v == null ? clear("bonusHigh2") : set("bonusHigh2", v))}
            />
            <div>
              <FieldLabel hint="Leave blank if none">RSU / equity vesting</FieldLabel>
              <AmountInput
                value={form.rsu}
                onChange={(v) => (v == null ? clear("rsu") : set("rsu", v))}
              />
            </div>
          </div>
        </div>

        {/* Retirement */}
        <div>
          <SectionLabel>Retirement</SectionLabel>
          <div className="space-y-3">
            <div>
              <FieldLabel hint="Annual total (e.g. $23,500 if maxed)">
                Your 401(k) contribution
              </FieldLabel>
              <AmountInput
                value={form.k401_1}
                onChange={(v) => (v == null ? clear("k401_1") : set("k401_1", v))}
                placeholder="e.g. 23500"
              />
            </div>
            <div>
              <FieldLabel hint="Annual total (e.g. $23,500 if maxed)">
                Spouse 401(k) contribution
              </FieldLabel>
              <AmountInput
                value={form.k401_2}
                onChange={(v) => (v == null ? clear("k401_2") : set("k401_2", v))}
                placeholder="e.g. 23500"
              />
            </div>
            <div>
              <FieldLabel>Backdoor Roth IRA</FieldLabel>
              <div className="space-y-1.5">
                {(["both", "one", "none"] as const).map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="backdoorRoth"
                      checked={form.backdoorRoth === opt}
                      onChange={() => set("backdoorRoth", opt)}
                      className="accent-indigo-600"
                    />
                    <span className="text-xs text-(--color-text)">
                      {opt === "both"
                        ? "Done for both spouses"
                        : opt === "one"
                          ? "Done for one spouse"
                          : "Not done this year"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Withholding */}
        <div>
          <SectionLabel>Withholding</SectionLabel>
          <div className="space-y-3">
            <div>
              <FieldLabel hint="From your W-2 box 2 or last pay stub">
                YTD federal withholding
              </FieldLabel>
              <AmountInput
                value={form.ytdWithholding}
                onChange={(v) => (v == null ? clear("ytdWithholding") : set("ytdWithholding", v))}
              />
            </div>
            <div>
              <FieldLabel>As of month</FieldLabel>
              <select
                value={form.ytdMonth ?? ""}
                onChange={(e) =>
                  e.target.value === ""
                    ? clear("ytdMonth")
                    : set("ytdMonth", Number(e.target.value))
                }
                className="w-full rounded-lg border border-(--color-border) bg-(--color-bg-muted) px-3 py-2 text-sm focus:border-(--color-text-muted) focus:outline-none"
              >
                <option value="">Select month…</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              {annualizedWithholding != null && (form.ytdMonth ?? 0) < 12 && (
                <p className="mt-1 text-[11px] text-(--color-text-muted)">
                  Annualized pace: ~${annualizedWithholding.toLocaleString()}/year
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Capital events */}
        <div>
          <SectionLabel>Capital events</SectionLabel>
          <div>
            <FieldLabel hint="Positive = gain, negative = loss. Leave blank if no planned sales.">
              Expected capital gain / loss
            </FieldLabel>
            <div className="relative">
              <input
                type="number"
                value={form.capitalGains ?? ""}
                onChange={(e) =>
                  e.target.value === ""
                    ? clear("capitalGains")
                    : set("capitalGains", Number(e.target.value))
                }
                placeholder="e.g. 8000 or -5000"
                className="w-full rounded-lg border border-(--color-border) bg-(--color-bg-muted) px-3 py-2 text-sm focus:border-(--color-text-muted) focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-(--color-border) px-4 py-3">
        <button
          onClick={handleClear}
          className="cursor-pointer text-xs text-(--color-text-muted) hover:text-(--color-text)"
        >
          Clear all
        </button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save & Regenerate"}
        </Button>
      </div>
    </div>
  );
}
