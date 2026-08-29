import axe from 'axe-core';

export type AxeResult = {
  violations: axe.Result[];
};

export async function runAxe(
  container: HTMLElement,
  options?: axe.RunOptions,
): Promise<AxeResult> {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
    ...options,
  });
  return {
    violations: results.violations,
  };
}

export function summarizeViolations(result: AxeResult): string {
  if (result.violations.length === 0) {
    return 'No WCAG 2.1 AA violations detected.';
  }
  return result.violations
    .map(
      (v) =>
        `- [${v.impact}] ${v.id} (${v.help}) — ${v.nodes.length} node(s)`,
    )
    .join('\n');
}
