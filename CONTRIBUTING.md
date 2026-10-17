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
- If you add or change an analytics event or tracking call, update `docs/analytics-spec.md` first and follow the [analytics event runbook](./bridgelet-product-audit/runbooks/review-analytics-spec-before-new-event.md) — see [Adding or Modifying Analytics Events](#adding-or-modifying-analytics-events).

## Adding or Modifying Analytics Events

Analytics events are specified before they are implemented. If your change adds
or changes a tracking call, work through the process before opening the PR:

1. Read the [analytics specification](./docs/analytics-spec.md). Event names and
   property keys must match it exactly, and it defines the privacy rules for
   payloads.
2. Run the pre-flight checklist in the
   [analytics event runbook](./bridgelet-product-audit/runbooks/review-analytics-spec-before-new-event.md):
   search for an existing event before adding one, confirm the `Noun Verb` name,
   update the spec, and place the event in the correct journey section.
3. Update the spec in the same pull request as the code, add the emitter to
   `frontend/lib/analytics.ts`, and follow the
   [analytics testing strategy](./TESTING.md#analytics-event-verification).

The runbook exists so a new event is a deliberate spec change rather than an
ad-hoc string in a component; reviewers will ask for the spec update when a
tracking call lands without one.

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
