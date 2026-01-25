# Security Policy

## Overview

Bridgelet is committed to maintaining the security of our infrastructure SDK and protecting users who rely on our ephemeral account system for Stellar payments. Given the financial nature of our platform, we take security vulnerabilities seriously and appreciate the security community's efforts in responsibly disclosing issues.

This document outlines our security practices, how to report vulnerabilities, and what to expect from our security response process.

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          | Status                      |
| ------- | ------------------ | --------------------------- |
| 0.1.x   | :white_check_mark: | MVP - Active Development    |
| < 0.1   | :x:                | Pre-release - Not Supported |

**Note:** As we are in early development (Q1 2026 MVP phase), security patches will be applied to the main branch and released as soon as possible. Once we reach stable releases, we will maintain security support for the current major version and one prior major version.

## Reporting a Vulnerability

### How to Report

If you discover a security vulnerability in Bridgelet, please report it responsibly by emailing:

**📧 Security Contact:** aminubabafatima8@gmail.com

**Please DO NOT:**

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before we've had a chance to address it
- Exploit the vulnerability beyond what is necessary to demonstrate the issue

### What to Include

To help us understand and address the issue quickly, please include:

1. **Description:** Clear explanation of the vulnerability
2. **Impact:** Potential security impact and affected components
3. **Reproduction Steps:** Detailed steps to reproduce the issue
4. **Proof of Concept:** Code, screenshots, or logs demonstrating the vulnerability
5. **Suggested Fix:** (Optional) Your recommendations for addressing the issue
6. **Environment Details:**
   - Affected repository (bridgelet-core, bridgelet-sdk, or bridgelet-ui)
   - Version or commit hash
   - Network (Stellar Testnet/Mainnet)
   - Any relevant configuration details

### Response Timeline

We are committed to responding promptly to security reports:

| Timeline              | Action                                                          |
| --------------------- | --------------------------------------------------------------- |
| **24-48 hours**       | Initial acknowledgment of your report                           |
| **3-5 business days** | Preliminary assessment and severity classification              |
| **7-14 days**         | Status update on investigation and planned fix timeline         |
| **30-90 days**        | Target resolution timeframe (varies by severity and complexity) |

**Note:** These are target timelines. Complex issues may require additional time, and we will keep you informed throughout the process.

### Severity Classification

We classify vulnerabilities using the following severity levels:

- **Critical:** Immediate risk of fund loss, unauthorized access to accounts, or complete system compromise
- **High:** Significant security impact affecting multiple users or core functionality
- **Medium:** Limited security impact with mitigating factors or requiring specific conditions
- **Low:** Minimal security impact or theoretical vulnerabilities

## Scope

### In Scope

Security issues in the following areas are within scope:

#### Smart Contracts (bridgelet-core)

- Fund sweep logic vulnerabilities
- Account restriction bypass
- Time-lock manipulation
- Authorization flaws
- Reentrancy or other contract exploits

#### Backend SDK (bridgelet-sdk)

- Authentication and authorization issues
- API security vulnerabilities
- Cryptographic implementation flaws
- Private key management issues
- Database security concerns
- Dependency vulnerabilities

#### Infrastructure

- Deployment security misconfigurations
- Secret management issues
- Network security concerns

### Out of Scope

The following are generally out of scope:

- Social engineering attacks against Bridgelet team members
- Physical attacks against infrastructure
- Denial of Service (DoS) attacks
- Issues in third-party dependencies (report these to the respective maintainers)
- Vulnerabilities requiring physical access to user devices
- Issues already known and documented in our issue tracker
- Theoretical vulnerabilities without practical exploit scenarios

## Security Model

Bridgelet implements a multi-layered security approach:

### Key Security Features

1. **Single-Use Accounts:** Ephemeral accounts are designed for one-time use, minimizing exposure
2. **Restricted Transfers:** Smart contract enforced destination locking
3. **Time-Based Expiration:** Automatic fund recovery for unclaimed accounts
4. **No Seed Phrase Exposure:** Recipients don't handle sensitive cryptographic material
5. **Claim Authentication:** Secure verification before fund release

For detailed information about our security architecture, threat model, and security assumptions, please refer to our [Security Model Documentation](./docs/security-model.pdf).

## Disclosure Policy

### Coordinated Disclosure

We follow a coordinated disclosure process:

1. **Private Disclosure:** You report the vulnerability privately to our security team
2. **Investigation:** We investigate and develop a fix
3. **Fix Development:** We create and test a security patch
4. **Release:** We deploy the fix to production and release updated versions
5. **Public Disclosure:** After the fix is deployed, we publish a security advisory
6. **Credit:** We acknowledge your contribution (if desired)

### Public Disclosure Timeline

- We aim to resolve and disclose vulnerabilities within **90 days** of the initial report
- If you plan to publicly disclose the vulnerability, please give us at least **90 days** notice
- We may request an extension if the issue is particularly complex
- We will work with you to coordinate the disclosure timeline

## Security Best Practices

### For Integrators

If you're integrating Bridgelet into your application:

1. **Keep Dependencies Updated:** Regularly update to the latest stable versions
2. **Secure Key Management:** Use hardware security modules (HSMs) or secure key management services for production keys
3. **Environment Isolation:** Separate development, staging, and production environments
4. **Monitor Transactions:** Implement monitoring and alerting for unusual account activity
5. **Rate Limiting:** Implement rate limiting on claim endpoints
6. **Audit Logs:** Maintain comprehensive audit logs for all account operations
7. **Network Security:** Use HTTPS/TLS for all API communications
8. **Input Validation:** Validate all inputs, especially Stellar addresses and amounts

### For Contributors

If you're contributing to Bridgelet:

1. **Code Review:** All code changes require security-focused review
2. **Dependency Scanning:** Run dependency vulnerability scans before submitting PRs
3. **Test Coverage:** Include security test cases for new features
4. **Secrets Management:** Never commit secrets, keys, or credentials to the repository
5. **Follow Guidelines:** Adhere to secure coding practices outlined in [CONTRIBUTING.md](./CONTRIBUTING.md)

## Security Hardening

### Recommended Configurations

#### Smart Contract Deployment

- Deploy contracts with multi-signature authorization for critical operations
- Use time-locks for administrative functions
- Implement circuit breakers for emergency situations
- Conduct thorough testing on Testnet before Mainnet deployment

#### SDK Configuration

- Enable all security headers (HSTS, CSP, X-Frame-Options, etc.)
- Use environment variables for sensitive configuration
- Implement request signing for API authentication
- Enable audit logging for all financial operations
- Configure appropriate CORS policies

#### Infrastructure

- Use principle of least privilege for all service accounts
- Enable encryption at rest and in transit
- Implement network segmentation
- Regular security patching and updates
- Enable monitoring and alerting

## Security Audits

As we approach production readiness, we plan to:

- Conduct professional smart contract audits
- Perform penetration testing on the SDK and infrastructure
- Engage with the Stellar security community for peer review
- Publish audit reports and findings

**Current Status:** Pre-audit phase (MVP development)

## Bug Bounty Program

We are currently evaluating the establishment of a bug bounty program. Details will be announced as we approach production release.

## Security Updates

Security advisories and updates will be published through:

- GitHub Security Advisories
- Release notes with security tags
- Direct notification to known integrators
- Stellar community channels

Subscribe to repository notifications to stay informed about security updates.

## Contact

**Security Email:** aminubabafatima8@gmail.com

**General Contact:**

- Issues: [GitHub Issues](https://github.com/bridgelet-org/bridgelet/issues) (non-security issues only)
- Discussions: [GitHub Discussions](https://github.com/bridgelet-org/bridgelet/discussions)

## Acknowledgments

We would like to thank:

- The Stellar security community for their guidance
- Security researchers who responsibly disclose vulnerabilities
- Open source security tools and frameworks that help us maintain security

### Security Standards & References

Our security practices are informed by:

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25 Most Dangerous Software Errors](https://cwe.mitre.org/top25/)
- [Stellar Security Best Practices](https://developers.stellar.org/docs/building-apps/security-best-practices)
- [Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)

## License

This security policy is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

---

**Last Updated:** January 25, 2026

**Thank you for helping keep Bridgelet and our users safe! 🔒**
