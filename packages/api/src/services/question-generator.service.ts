/**
 * Skill Question Generator — uses Claude AI to generate FCCPA-compliant
 * mandatory skill questions for each campaign.
 *
 * FCCPA §114 requires that participants demonstrate skill/knowledge before
 * purchasing raffle tickets. Questions must be non-trivial and not answerable
 * simply by reading the campaign page.
 *
 * Question categories (rotated to ensure variety):
 *   - Nigerian Land Law (Land Use Act 1978, C of O, Right of Occupancy)
 *   - FCCPA / consumer protection regulations
 *   - Property finance (NHF, FMBN, stamp duty, mortgage)
 *   - Real estate valuation (NIESV, market vs forced-sale value)
 *   - Construction & building codes (setbacks, BQ, building approval)
 *   - Nigerian property geography (zones, LGAs, property hotspots)
 */

import Anthropic from '@anthropic-ai/sdk';

export interface SkillQuestion {
  question: string;
  options: [string, string, string, string]; // exactly 4 options
  correctIndex: 0 | 1 | 2 | 3;
}

interface CampaignContext {
  propertyType: string;  // RESIDENTIAL | COMMERCIAL | LAND | MIXED_USE
  propertyState: string;
  propertyLga: string;
  marketValue: number;
  title: string;
}

const client = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'],
});

/**
 * Generate 5 unique skill questions for a campaign.
 * Questions are about Nigerian real estate knowledge — NOT about the
 * specific property being raffled, so they cannot be answered by
 * reading the campaign page.
 */
export async function generateSkillQuestions(
  context: CampaignContext,
  count = 5,
): Promise<SkillQuestion[]> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const prompt = buildPrompt(context, count);

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  return parseQuestions(text, count);
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(ctx: CampaignContext, count: number): string {
  const propertyTypeLabel: Record<string, string> = {
    RESIDENTIAL: 'residential property',
    COMMERCIAL: 'commercial property',
    LAND: 'land',
    MIXED_USE: 'mixed-use property',
  };

  return `You are a Nigerian real estate compliance officer generating mandatory skill questions for a property raffle campaign under FCCPA §114.

Campaign context:
- Property type: ${propertyTypeLabel[ctx.propertyType] ?? ctx.propertyType}
- Location: ${ctx.propertyLga}, ${ctx.propertyState} State, Nigeria
- Market value: ₦${ctx.marketValue.toLocaleString()}
- Campaign title: ${ctx.title}

Generate exactly ${count} multiple-choice questions that test genuine Nigerian real estate knowledge.

STRICT RULES:
1. Questions must NOT be answerable from the campaign page (don't ask about this specific property's price, address, or features).
2. Cover a range of these topics — do not repeat topics:
   - Nigerian Land Use Act 1978 (vesting of land, governor's consent, C of O)
   - FCCPA / consumer protection (refund rights, draw requirements, receipts)
   - Property financing in Nigeria (NHF, FMBN, FHA, mortgage LTV, stamp duty rates)
   - Real estate valuation (NIESV, market value vs forced-sale value, valuation methods)
   - Property transactions (land registration, deed of assignment, perfection of title)
   - Nigerian building regulations (setback requirements, BQ, development approval process)
   - Property taxation (Lagos Land Use Charge, capital gains tax on property)
3. Each question must have exactly 4 options (A, B, C, D) with only ONE correct answer.
4. Wrong options must be plausible — not obviously wrong.
5. Questions must be factually accurate as of current Nigerian law and practice.

Return ONLY a valid JSON array — no explanation, no markdown, no extra text:

[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0
  }
]

correctIndex is 0-based (0 = first option is correct).`;
}

// ─── Response parser ──────────────────────────────────────────────────────────

function parseQuestions(raw: string, expectedCount: number): SkillQuestion[] {
  // Extract JSON array from the response — Claude sometimes wraps in backticks
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain a valid JSON array');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('AI response contained malformed JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('AI response was not a JSON array');
  }

  const questions: SkillQuestion[] = [];

  for (const item of parsed) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Record<string, unknown>)['question'] !== 'string' ||
      !Array.isArray((item as Record<string, unknown>)['options']) ||
      ((item as Record<string, unknown>)['options'] as unknown[]).length !== 4 ||
      typeof (item as Record<string, unknown>)['correctIndex'] !== 'number'
    ) {
      continue; // skip malformed items
    }

    const q = item as { question: string; options: string[]; correctIndex: number };

    const correctIndex = Math.round(q.correctIndex);
    if (correctIndex < 0 || correctIndex > 3) continue;

    questions.push({
      question: q.question.trim(),
      options: [
        String(q.options[0] ?? '').trim(),
        String(q.options[1] ?? '').trim(),
        String(q.options[2] ?? '').trim(),
        String(q.options[3] ?? '').trim(),
      ],
      correctIndex: correctIndex as 0 | 1 | 2 | 3,
    });
  }

  if (questions.length < expectedCount) {
    throw new Error(
      `AI only returned ${questions.length} valid questions, expected ${expectedCount}`,
    );
  }

  return questions.slice(0, expectedCount);
}
