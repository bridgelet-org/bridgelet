# Checklist: Documentation Freshness Review

Periodic review of the repository's `docs/` directory to catch stale content and ensure all documentation remains accurate and up-to-date.

## Review Cadence: Bi-Annual (Every 6 Months)
This review should run **twice per year** (June and December) to ensure documentation stays current with product development cycles. This cadence:
- Aligns with major release milestones
- Balances the overhead of manual reviews with the risk of stale documentation
- Complements the quarterly PDF artifact spot check

## Overall Review Owner: Technical Documentation Lead
The documentation lead is responsible for coordinating each review cycle, assigning individual document owners, and tracking all action items until completion.

---

## Individual Document Review Checklist

### 1. `docs/GLOSSARY.md`
- **Document Owner**: Product Management Team
- **Last Reviewed Date**: _______________
- **Review Items**:
  - [ ] All terms are still relevant to the current product scope
  - [ ] New terminology introduced since last review has been added
  - [ ] Definitions are accurate and reflect current implementation
  - [ ] No outdated terms remain that refer to removed features
  - [ ] Cross-references to other documents are still valid

### 2. `docs/sender-auth-model.md`
- **Document Owner**: Core Engineering Team
- **Last Reviewed Date**: _______________
- **Review Items**:
  - [ ] Authentication flows described match current implementation
  - [ ] Security properties are still accurate and enforced
  - [ ] All error conditions documented are still relevant
  - [ ] Any changes to the auth model have been incorporated
  - [ ] Diagrams or flowcharts accurately represent the current system

### 3. `docs/security-model.mdx`
- **Document Owner**: Security Engineering Team
- **Last Reviewed Date**: _______________
- **Review Items**:
  - [ ] Threat model covers all current attack surfaces
  - [ ] Mitigations described are still in place and effective
  - [ ] Compliance requirements are up-to-date
  - [ ] Any new security controls have been documented
  - [ ] Links to related security documents are functional
- **PDF Pair Check**:
  - [ ] Confirm `security-model.pdf` matches the current `.mdx` source (trigger the [PDF artifact freshness spot check](../runbooks/pdf-artifact-freshness-spot-check.md) if discrepancies are found)

### 4. `docs/architecture.mdx`
- **Document Owner**: System Architecture Team
- **Last Reviewed Date**: _______________
- **Review Items**:
  - [ ] System components and their interactions are accurately described
  - [ ] New services or components added since last review are included
  - [ ] Deprecated components have been removed or marked as legacy
  - [ ] Data flows described match current implementation
  - [ ] Technology stack information is current
- **PDF Pair Check**:
  - [ ] Confirm `architecture.pdf` matches the current `.mdx` source (trigger the [PDF artifact freshness spot check](../runbooks/pdf-artifact-freshness-spot-check.md) if discrepancies are found)

### 5. `docs/integration-guide.mdx`
- **Document Owner**: Developer Relations Team
- **Last Reviewed Date**: _______________
- **Review Items**:
  - [ ] API endpoints documented match the current API surface
  - [ ] Integration steps are accurate and tested
  - [ ] Code examples work with the latest version
  - [ ] Troubleshooting section covers common current issues
  - [ ] Rate limits, quotas, and restrictions are up-to-date
- **PDF Pair Check**:
  - [ ] Confirm `integration-guide.pdf` matches the current `.mdx` source (trigger the [PDF artifact freshness spot check](../runbooks/pdf-artifact-freshness-spot-check.md) if discrepancies are found)

---

## Cross-Cutting Review Items (All Documents)
- [ ] **MDX/PDF Pair Verification**: All paired `.mdx` and `.pdf` files have been checked for content drift (one randomly selected file during this cycle, per the [PDF artifact freshness spot check](../runbooks/pdf-artifact-freshness-spot-check.md))
- [ ] **Internal Links**: All hyperlinks between documents in the `docs/` directory resolve correctly
- [ ] **External Links**: Any external links (to third-party documentation, tools, etc.) are still active and accurate
- [ ] **Screenshots/Diagrams**: All visual assets are current and reflect the current UI/system state
- [ ] **Contact Information**: Any team or individual contact details are still accurate

## Post-Review Steps
1. **Document All Findings**: Create a single issue summarizing all stale content found during the review
2. **Assign Remediation Tasks**: Tag the appropriate document owners to address each finding
3. **Schedule Next Review**: Add the next bi-annual review to the team's calendar
4. **Update Last Reviewed Dates**: Fill in all "Last Reviewed Date" fields in this checklist and commit the updates

## Related Resources
- [PDF Artifact Freshness Spot Check](../runbooks/pdf-artifact-freshness-spot-check.md) - Runbook for manually verifying PDF exports match their mdx sources
- [Rebuild docs PDF from mdx](../runbooks/rebuild-docs-pdf-from-mdx.md) - Runbook for regenerating PDFs after source changes
- [docs-mdx-vs-pdf-pairs.md](../glossary/docs-mdx-vs-pdf-pairs.md) - Glossary entry listing all paired documentation files