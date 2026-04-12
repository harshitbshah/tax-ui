export type AnalysisSectionId =
  | "outcome"
  | "root_cause"
  | "income_story"
  | "capital_gains"
  | "key_decisions"
  | "watch_next_year";

export type AnalysisStat = {
  label: string;
  value: string;
  // If true, rendered prominently in the hero bar (e.g. the net amount owed)
  highlight?: boolean;
};

export type AnalysisSection = {
  id: AnalysisSectionId;
  title: string;
  // One-liner shown below the title when the card is collapsed
  subtitle?: string;
  // Big stat callout rendered at the top of the card body
  highlight?: { value: string; label: string };
  markdown: string;
  generatedAt: string;
};

export type AnalysisResponse = {
  year: number;
  country: string;
  sections: AnalysisSection[];
  // Key numbers shown in the hero bar above all sections
  stats?: AnalysisStat[];
  generatedAt: string;
  // Audit trail — "claude_code" for Claude Code-generated, "api" for future server-side generation
  source: "claude_code" | "api";
};

const VALID_SECTION_IDS = new Set<AnalysisSectionId>([
  "outcome",
  "root_cause",
  "income_story",
  "capital_gains",
  "key_decisions",
  "watch_next_year",
]);

export function isValidSectionId(id: string): id is AnalysisSectionId {
  return VALID_SECTION_IDS.has(id as AnalysisSectionId);
}

// Validates the shape of an unknown object as AnalysisResponse.
// Returns the typed value if valid, throws with a descriptive message if not.
export function parseAnalysisResponse(raw: unknown): AnalysisResponse {
  if (!raw || typeof raw !== "object") throw new Error("Expected an object");
  const r = raw as Record<string, unknown>;

  if (typeof r.year !== "number") throw new Error("Missing or invalid 'year'");
  if (typeof r.country !== "string") throw new Error("Missing or invalid 'country'");
  if (typeof r.generatedAt !== "string") throw new Error("Missing or invalid 'generatedAt'");
  if (r.source !== "claude_code" && r.source !== "api")
    throw new Error("'source' must be 'claude_code' or 'api'");
  if (!Array.isArray(r.sections)) throw new Error("'sections' must be an array");

  const sections: AnalysisSection[] = r.sections.map((s: unknown, i: number) => {
    if (!s || typeof s !== "object") throw new Error(`sections[${i}]: expected object`);
    const sec = s as Record<string, unknown>;
    if (typeof sec.id !== "string") throw new Error(`sections[${i}]: missing 'id'`);
    if (typeof sec.title !== "string") throw new Error(`sections[${i}]: missing 'title'`);
    if (typeof sec.markdown !== "string") throw new Error(`sections[${i}]: missing 'markdown'`);
    if (typeof sec.generatedAt !== "string")
      throw new Error(`sections[${i}]: missing 'generatedAt'`);

    const section: AnalysisSection = {
      id: isValidSectionId(sec.id) ? sec.id : (sec.id as AnalysisSectionId),
      title: sec.title,
      markdown: sec.markdown,
      generatedAt: sec.generatedAt,
    };

    if (typeof sec.subtitle === "string") section.subtitle = sec.subtitle;

    if (sec.highlight && typeof sec.highlight === "object") {
      const h = sec.highlight as Record<string, unknown>;
      if (typeof h.value === "string" && typeof h.label === "string") {
        section.highlight = { value: h.value, label: h.label };
      }
    }

    return section;
  });

  let stats: AnalysisStat[] | undefined;
  if (Array.isArray(r.stats)) {
    stats = r.stats.map((s: unknown, i: number) => {
      if (!s || typeof s !== "object") throw new Error(`stats[${i}]: expected object`);
      const st = s as Record<string, unknown>;
      if (typeof st.label !== "string") throw new Error(`stats[${i}]: missing 'label'`);
      if (typeof st.value !== "string") throw new Error(`stats[${i}]: missing 'value'`);
      return { label: st.label, value: st.value, highlight: st.highlight === true };
    });
  }

  return {
    year: r.year,
    country: r.country,
    sections,
    stats,
    generatedAt: r.generatedAt,
    source: r.source as "claude_code" | "api",
  };
}
