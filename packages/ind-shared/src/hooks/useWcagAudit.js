import { useState, useCallback, useRef } from 'react';

const AGENT_URL = 'http://localhost:8090/api/wcag/audit';

/**
 * Inspects a container DOM element to build a lightweight structured summary
 * (NOT the full HTML — just counts and attributes the agent needs to reason about).
 * This keeps the payload small and avoids sending raw markup to the server.
 */
function extractDomInfo(containerEl) {
  if (!containerEl) return {};

  const q = sel => Array.from(containerEl.querySelectorAll(sel));

  const images = q('img').map(img => ({
    alt: img.hasAttribute('alt') ? img.getAttribute('alt') : null,
    role: img.getAttribute('role'),
    isDecorative: img.getAttribute('role') === 'presentation' || img.getAttribute('alt') === '',
  }));

  const inputs = q('input, textarea, select').map(inp => {
    const id = inp.id;
    const labelEl = id ? containerEl.querySelector(`label[for="${id}"]`) : inp.closest('label');
    const ariaLabel = inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby');
    return {
      type: inp.type || inp.tagName.toLowerCase(),
      label: Boolean(labelEl || ariaLabel),
      autocomplete: inp.getAttribute('autocomplete'),
      ariaRequired: inp.getAttribute('aria-required'),
      ariaInvalid: inp.getAttribute('aria-invalid'),
      ariaDescribedby: inp.getAttribute('aria-describedby'),
    };
  });

  const buttons = q('button, [role="button"], a[href]').map(btn => ({
    label: (btn.getAttribute('aria-label') || btn.textContent || '').trim(),
    type: btn.getAttribute('type'),
    disabled: btn.hasAttribute('disabled'),
    tabIndex: btn.tabIndex,
    rect: (() => { try { const r = btn.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; } catch { return null; } })(),
  }));

  const tables = q('table').map(tbl => ({
    hasCaption: Boolean(tbl.querySelector('caption')),
    hasScope: Boolean(tbl.querySelector('[scope]')),
    hasThead: Boolean(tbl.querySelector('thead')),
    ariaLabel: tbl.getAttribute('aria-label') || tbl.getAttribute('aria-labelledby'),
  }));

  const headings = q('h1,h2,h3,h4,h5,h6').map(h => parseInt(h.tagName[1], 10));

  const focusable = q('a[href],button,input,select,textarea,[tabindex]');
  const hasFocusStyles = focusable.some(el => {
    try {
      return getComputedStyle(el, ':focus-visible').outlineWidth !== '0px';
    } catch { return false; }
  });

  const smallTargets = buttons.filter(b => b.rect && (b.rect.w < 24 || b.rect.h < 24)).length;

  return {
    images,
    inputs,
    buttons,
    tables,
    headingLevels: headings,
    focusableCount: focusable.length,
    hasFocusStyles,
    hasSkipLink: Boolean(document.querySelector('a[href="#main-content"], a[href="#content"]')),
    roles: [...new Set(q('[role]').map(el => el.getAttribute('role')))],
    liveRegions: q('[aria-live],[role="status"],[role="alert"]').length,
    smallTargets,
  };
}

/**
 * useWcagAudit(componentName)
 *
 * Returns:
 *   containerRef  — attach to the root element of the component under audit
 *   runAudit()    — trigger a manual audit run
 *   result        — { issues, summary, score, source } | null
 *   isAuditing    — boolean
 */
export function useWcagAudit(componentName) {
  const containerRef = useRef(null);
  const [result, setResult] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const runAudit = useCallback(async () => {
    setIsAuditing(true);
    try {
      const domInfo = extractDomInfo(containerRef.current);
      const response = await fetch(AGENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component: componentName, domInfo }),
      });
      if (!response.ok) throw new Error(`Agent server returned ${response.status}`);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      // Degrade gracefully — show a connectivity message, not a crash
      setResult({
        source: 'offline',
        issues: [],
        summary: `Agent server unavailable (${err.message}). Start the server with: npm run start:server`,
        score: null,
      });
    } finally {
      setIsAuditing(false);
    }
  }, [componentName]);

  return { containerRef, runAudit, result, isAuditing };
}
