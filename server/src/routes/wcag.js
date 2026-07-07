const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();

// ---------------------------------------------------------------------------
// WCAG 2.2 success criteria reference (used both in prompts and static audit)
// ---------------------------------------------------------------------------
const WCAG22_CRITERIA = {
  '1.1.1': { level: 'A',  title: 'Non-text Content',        principle: 'Perceivable'  },
  '1.3.1': { level: 'A',  title: 'Info and Relationships',  principle: 'Perceivable'  },
  '1.3.5': { level: 'AA', title: 'Identify Input Purpose',  principle: 'Perceivable'  },
  '1.4.1': { level: 'A',  title: 'Use of Color',            principle: 'Perceivable'  },
  '1.4.3': { level: 'AA', title: 'Contrast (Minimum)',      principle: 'Perceivable'  },
  '1.4.4': { level: 'AA', title: 'Resize text',             principle: 'Perceivable'  },
  '1.4.10':{ level: 'AA', title: 'Reflow',                  principle: 'Perceivable'  },
  '1.4.11':{ level: 'AA', title: 'Non-text Contrast',       principle: 'Perceivable'  },
  '1.4.12':{ level: 'AA', title: 'Text Spacing',            principle: 'Perceivable'  },
  '2.1.1': { level: 'A',  title: 'Keyboard',                principle: 'Operable'     },
  '2.4.3': { level: 'A',  title: 'Focus Order',             principle: 'Operable'     },
  '2.4.6': { level: 'AA', title: 'Headings and Labels',     principle: 'Operable'     },
  '2.4.7': { level: 'AA', title: 'Focus Visible',           principle: 'Operable'     },
  '2.4.11':{ level: 'AA', title: 'Focus Appearance',        principle: 'Operable'     }, // new in 2.2
  '2.5.3': { level: 'A',  title: 'Label in Name',           principle: 'Operable'     },
  '2.5.8': { level: 'AA', title: 'Target Size (Minimum)',   principle: 'Operable'     }, // new in 2.2
  '3.3.1': { level: 'A',  title: 'Error Identification',    principle: 'Understandable'},
  '3.3.2': { level: 'A',  title: 'Labels or Instructions',  principle: 'Understandable'},
  '4.1.2': { level: 'A',  title: 'Name, Role, Value',       principle: 'Robust'       },
  '4.1.3': { level: 'AA', title: 'Status Messages',         principle: 'Robust'       },
};

// ---------------------------------------------------------------------------
// Static rule engine — zero-dependency quick checks on serialised DOM info
// (runs even when no API key is configured so the panel always has content)
// ---------------------------------------------------------------------------
function staticAudit(context) {
  const issues = [];
  const { component, domInfo } = context;

  if (domInfo.images?.some(img => !img.alt)) {
    issues.push({ criterion: '1.1.1', severity: 'critical',
      element: 'img',
      description: 'One or more images are missing alt text.',
      fix: 'Add a descriptive alt attribute to every <img>. Use alt="" for decorative images so screen readers skip them.' });
  }

  if (domInfo.inputs?.some(i => !i.label)) {
    issues.push({ criterion: '1.3.1', severity: 'critical',
      element: 'input',
      description: 'Form inputs lack associated <label> elements.',
      fix: 'Wrap each input in a <FormControl> with a <FormLabel>. Chakra UI\'s FormControl automatically wires aria-labelledby.' });
  }

  if (domInfo.inputs?.some(i => !i.autocomplete && ['email','username','password','tel'].includes(i.type))) {
    issues.push({ criterion: '1.3.5', severity: 'moderate',
      element: 'input',
      description: 'Inputs for personal data are missing autocomplete attributes.',
      fix: 'Add autocomplete="username", autocomplete="current-password", etc. to relevant inputs.' });
  }

  if (domInfo.buttons?.some(b => (b.label || '').trim() === '')) {
    issues.push({ criterion: '2.5.3', severity: 'critical',
      element: 'button',
      description: 'One or more buttons have no accessible name.',
      fix: 'Add aria-label or visible text to every interactive element. For icon-only buttons use aria-label="…" or a visually-hidden <span>.' });
  }

  if (domInfo.focusableCount !== undefined && !domInfo.hasFocusStyles) {
    issues.push({ criterion: '2.4.7', severity: 'serious',
      element: 'global',
      description: 'Focus indicators may not be visible — :focus-visible styles appear to be suppressed.',
      fix: 'Never set outline:none without providing a replacement focus style. Chakra UI\'s focus-visible ring can be enabled globally via the theme focusVisibleWrapper.' });
  }

  if (!domInfo.hasSkipLink) {
    issues.push({ criterion: '2.4.1', severity: 'moderate',
      element: 'nav',
      description: 'No "Skip to main content" link detected.',
      fix: 'Add a visually-hidden <a href="#main-content"> as the first element in <body>. Show it on :focus.' });
  }

  if (domInfo.headingLevels && domInfo.headingLevels.length > 0) {
    const sorted = [...domInfo.headingLevels].sort();
    const hasSingleH1 = sorted.filter(h => h === 1).length === 1;
    if (!hasSingleH1) {
      issues.push({ criterion: '2.4.6', severity: 'moderate',
        element: 'heading',
        description: 'Page does not have exactly one <h1> — heading hierarchy is unclear.',
        fix: 'Ensure every page has exactly one <h1> describing its purpose. Use h2–h6 for subsections in order without skipping levels.' });
    }
  }

  if (domInfo.tables?.some(t => !t.hasCaption || !t.hasScope)) {
    issues.push({ criterion: '1.3.1', severity: 'serious',
      element: 'table',
      description: 'Data tables are missing <caption> or column/row scope attributes.',
      fix: 'Add <caption> to every data table and scope="col"/"row" to header cells. Use Chakra Table with the <Thead>/<Tbody> structure.' });
  }

  if (domInfo.smallTargets > 0) {
    issues.push({ criterion: '2.5.8', severity: 'moderate',
      element: 'button/link',
      description: `${domInfo.smallTargets} interactive target(s) appear smaller than the WCAG 2.2 minimum of 24×24 CSS pixels.`,
      fix: 'Set a minimum height/width of 24px on all interactive elements. Chakra\'s Button size="sm" already meets this; icon buttons need an explicit minW/minH="24px".' });
  }

  // Enrich with WCAG metadata
  return issues.map(issue => ({
    ...issue,
    wcag: WCAG22_CRITERIA[issue.criterion] || {},
  }));
}

// ---------------------------------------------------------------------------
// POST /api/wcag/audit
// Body: { component: string, domInfo: object, userContext?: string }
// Returns: { issues: WcagIssue[], summary: string, score: number }
// ---------------------------------------------------------------------------
router.post('/audit', async (req, res) => {
  const { component, domInfo, userContext } = req.body;

  if (!component || !domInfo) {
    return res.status(400).json({ error: 'component and domInfo are required' });
  }

  // Always run the static engine first
  const staticIssues = staticAudit({ component, domInfo });

  // If no API key, return static results only
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.json({
      source: 'static',
      issues: staticIssues,
      summary: `Static audit found ${staticIssues.length} issue(s). Add ANTHROPIC_API_KEY to .env for AI-powered analysis.`,
      score: Math.max(0, 100 - staticIssues.reduce((acc, i) =>
        acc + ({ critical: 20, serious: 12, moderate: 6, minor: 2 }[i.severity] || 0), 0)),
    });
  }

  // AI-powered deeper analysis via Claude
  try {
    const client = new Anthropic.default({ apiKey });

    const systemPrompt = `You are a WCAG 2.2 accessibility expert auditing a React component in a telecom NOC dashboard built with Chakra UI.

Your job: analyse the provided DOM/component information and return a JSON array of accessibility issues not already caught by the static rule engine.

Each issue must follow this schema exactly:
{
  "criterion": "X.X.X",       // WCAG 2.2 success criterion number
  "severity": "critical|serious|moderate|minor",
  "element": "short element name",
  "description": "1–2 sentence explanation of the problem",
  "fix": "1–3 sentence concrete fix referencing Chakra UI APIs where applicable"
}

WCAG 2.2 criteria to check beyond the static rules:
- 1.4.3 Contrast (Minimum) — text must be ≥4.5:1 on its background
- 1.4.11 Non-text Contrast — UI components ≥3:1
- 1.4.12 Text Spacing — layout must not break when letter/word/line spacing is increased
- 1.4.10 Reflow — content must not require horizontal scroll at 320px width
- 2.1.1 Keyboard — all interactions reachable and operable without a mouse
- 2.4.11 Focus Appearance (2.2) — focus indicator ≥2px, ≥3:1 contrast with neighbour
- 2.5.8 Target Size Minimum (2.2) — interactive targets ≥24×24px
- 3.3.1 Error Identification — errors must be described in text, not colour alone
- 3.3.2 Labels or Instructions — complex inputs need helper text
- 4.1.2 Name, Role, Value — custom widgets must expose correct ARIA roles/states
- 4.1.3 Status Messages — live regions needed for async updates

Rules:
- Return ONLY a valid JSON array, no markdown fences, no preamble.
- Return an empty array [] if the component appears fully compliant.
- Do not repeat issues already listed in the static issues provided.
- Keep descriptions factual and fix suggestions actionable.`;

    const userPrompt = `Component: ${component}
${userContext ? `Context: ${userContext}` : ''}

DOM information:
${JSON.stringify(domInfo, null, 2)}

Static issues already found (do NOT repeat these):
${JSON.stringify(staticIssues.map(i => i.criterion + ' ' + i.description), null, 2)}

Return the JSON array of additional WCAG 2.2 issues:`;

    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let aiIssues = [];
    try {
      const text = message.content.find(b => b.type === 'text')?.text || '[]';
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      aiIssues = Array.isArray(parsed) ? parsed.map(issue => ({
        ...issue,
        wcag: WCAG22_CRITERIA[issue.criterion] || {},
      })) : [];
    } catch {
      // AI returned unparseable output — degrade to static only
    }

    const allIssues = [...staticIssues, ...aiIssues];
    const score = Math.max(0, 100 - allIssues.reduce((acc, i) =>
      acc + ({ critical: 20, serious: 12, moderate: 6, minor: 2 }[i.severity] || 0), 0));

    const criticalCount = allIssues.filter(i => i.severity === 'critical' || i.severity === 'serious').length;

    return res.json({
      source: 'ai',
      issues: allIssues,
      summary: criticalCount > 0
        ? `Found ${criticalCount} critical/serious issue(s) across ${allIssues.length} total. Addressing these will significantly improve assistive-technology support.`
        : allIssues.length > 0
          ? `${allIssues.length} minor/moderate improvement(s) found. Component is mostly compliant.`
          : 'No WCAG 2.2 issues detected. Component appears fully compliant.',
      score,
    });

  } catch (err) {
    console.error('[wcag-agent] Claude call failed:', err.message);
    // Graceful fallback to static results
    return res.json({
      source: 'static-fallback',
      issues: staticIssues,
      summary: `AI audit unavailable (${err.message}). Static audit found ${staticIssues.length} issue(s).`,
      score: Math.max(0, 100 - staticIssues.reduce((acc, i) =>
        acc + ({ critical: 20, serious: 12, moderate: 6, minor: 2 }[i.severity] || 0), 0)),
    });
  }
});

// GET /api/wcag/criteria — reference data for the frontend
router.get('/criteria', (_req, res) => res.json(WCAG22_CRITERIA));

module.exports = router;
