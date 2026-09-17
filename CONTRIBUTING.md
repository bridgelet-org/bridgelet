# Contributing to Bridgelet

Thanks for helping improve Bridgelet! Please read this guide before opening an issue or pull request.

## Ground Rules

- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md) in all community spaces.
- Start with the [Support Guide](./SUPPORT.md) to choose the right channel for questions vs. bugs.
- For security issues, **do not** open a public issue; follow `SECURITY.md`.

## Ways to Contribute

- **Report bugs:** Use GitHub Issues with clear reproduction steps, expected vs. actual behavior, logs, and environment details.
- **Ask questions or propose ideas:** Use GitHub Discussions for how-to topics, design feedback, and feature requests.
- **Improve docs:** Submit PRs for docs corrections or clarifications.
- **Code contributions:** Focus on well-scoped changes with tests when applicable.

## Pull Request Checklist

- Keep PRs focused; prefer small, reviewable changes.
- Include tests or notes on why tests are not required.
- Update documentation when behavior or APIs change.
- Link related issues/discussions and describe the approach and rationale.
- **Adding or modifying a tracked analytics event?** Read [the analytics spec review runbook](./bridgelet-product-audit/runbooks/review-analytics-spec-before-new-event.md) first — the spec must be updated before tracking code is implemented.

## Development Notes

- See the repository README and `/docs` for architecture and setup details.
- Align with existing patterns and follow project style where present.

## Releases

Releases are cut with [release-it](https://github.com/release-it/release-it):

```bash
npm run release           # patch release (default)
npm run release -- minor  # minor release
npm run release -- major  # major release
npm run release:dry-run   # preview what the release would do
npm run changelog         # print the changelog for the next release (preview)
```

`CHANGELOG.md` entries are generated automatically from conventional commits
and written by release-it as part of `npm run release`; see the "Release
process" note at the top of `CHANGELOG.md` for the manual override policy.

## Questions?

If you are unsure how to proceed, open a GitHub Discussion or email the maintainers per [SUPPORT.md](./SUPPORT.md). We are happy to help you get started.

## Reference

- [Governance](./docs/GOVERNANCE.md) — outlines project roles, decision-making, and contributor participation.
