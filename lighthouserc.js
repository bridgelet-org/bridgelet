module.exports = {
  ci: {
    collect: {
      // Build directory location where the production app compiles
      staticDistDir: './out', 
      numberOfRuns: 3,
    },
    assert: {
      // Enforce zero tolerance for regression dropping below target parameters
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['off'], // Can be tuned to 'warn' or 'error' if needed later
      },
    },
    upload: {
      target: 'temporary-public-storage', // Saves HTML trace artifact summaries for review on failure
    },
  },
};