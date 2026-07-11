/**
 * Skill extraction — pure functions that find taxonomy skills in a
 * posting's title/description and classify them as required or
 * preferred. Persisted as JobSkillRequirement by the matching service.
 */

export type TaxonomySkill = {
  id: string;
  name: string;
  category: string;
  aliases: string[];
};

export type ExtractedSkill = {
  skillId: string;
  name: string;
  category: string;
  required: boolean;
  /** The alias/name that actually matched, for transparency. */
  matchedTerm: string;
};

const PREFERRED_CONTEXT =
  /\b(preferred|nice[- ]to[- ]have|bonus|a plus|asset|desirable|would be (great|nice)|not required)\b/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary matcher that tolerates terms ending in symbols (C++, Security+). */
function termRegex(term: string): RegExp {
  const escaped = escapeRegExp(term);
  const endsWithWord = /\w$/.test(term);
  return new RegExp(
    `(?<![\\w+])${escaped}${endsWithWord ? "(?![\\w+])" : ""}`,
    "i"
  );
}

/**
 * Splits text into sentence-ish fragments so "preferred" in one
 * bullet doesn't demote skills mentioned elsewhere.
 */
function fragments(text: string): string[] {
  return text
    .split(/[.\n•;]+/)
    .map((f) => f.trim())
    .filter(Boolean);
}

export function extractSkills(
  taxonomy: TaxonomySkill[],
  title: string,
  description: string
): ExtractedSkill[] {
  const text = `${title}\n${description}`;
  const parts = fragments(text);
  const found = new Map<string, ExtractedSkill>();

  for (const skill of taxonomy) {
    const terms = [skill.name, ...skill.aliases];
    for (const term of terms) {
      if (term.length < 2) continue;
      const re = termRegex(term);
      if (!re.test(text)) continue;

      // Required unless EVERY fragment mentioning it reads as preferred.
      const mentioning = parts.filter((p) => re.test(p));
      const required =
        mentioning.length === 0 ||
        mentioning.some((p) => !PREFERRED_CONTEXT.test(p));

      const existing = found.get(skill.id);
      if (!existing) {
        found.set(skill.id, {
          skillId: skill.id,
          name: skill.name,
          category: skill.category,
          required,
          matchedTerm: term,
        });
      } else if (required && !existing.required) {
        existing.required = true; // strongest signal wins
      }
      break; // first matching term per skill is enough
    }
  }

  return [...found.values()];
}
