# Contributing to Bridgelet

Thank you for your interest in contributing to Bridgelet! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Security Issues](#security-issues)
- [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Expected Behavior

- Be respectful and constructive in communication
- Focus on what is best for the project and community
- Show empathy towards other contributors
- Accept constructive criticism gracefully
- Collaborate openly and transparently

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing others' private information
- Any conduct that would be inappropriate in a professional setting

### Enforcement

Violations can be reported to aminubabafatima8@gmail.com. All reports will be reviewed and investigated confidentially.

---

## How Can I Contribute?

### Reporting Bugs

**Before submitting a bug report:**
- Check existing issues to avoid duplicates
- Gather information about the bug
- Try to reproduce it consistently

**Submit a bug report:**
1. Use the bug report template
2. Provide clear title and description
3. Include steps to reproduce
4. Add relevant logs, screenshots, or error messages
5. Specify your environment (OS, Node version, etc.)

**Example:**
```markdown
**Bug:** Account creation fails with valid inputs

**Steps to reproduce:**
1. Call POST /accounts with valid payload
2. Observe 500 error response

**Expected:** Account created successfully
**Actual:** Internal server error

**Environment:** 
- OS: Ubuntu 22.04
- Node: 20.10.0
- SDK version: 0.1.0

**Logs:**
```
Error: Contract invocation failed...
```
```

### Suggesting Enhancements

**Enhancement suggestions should include:**
- Clear use case and motivation
- Expected behavior
- Why this enhancement benefits users
- Alternatives considered

**Label your suggestion:**
- `enhancement`: New feature or improvement
- `discussion`: Needs community input
- `documentation`: Docs-related enhancement

### Contributing Code

**Areas where we need help:**

**High Priority:**
- Bug fixes
- Test coverage improvements
- Documentation improvements
- Security hardening

**Medium Priority:**
- Performance optimizations
- Error handling improvements
- Developer experience enhancements

**Low Priority (Nice to Have):**
- Code refactoring
- Additional examples
- Tooling improvements

---

## Development Setup

### Prerequisites

- **Node.js:** v20+
- **PostgreSQL:** v15+
- **Rust:** v1.75+ (for Core contracts)
- **Git:** v2.40+
- **Docker:** v24+ (optional but recommended)

### Initial Setup

1. **Fork and clone:**
```bash
# Fork repo on GitHub first, then:
git clone https://github.com/bridgelet-org/bridgelet-sdk.git
cd bridgelet-sdk
```

2. **Install dependencies:**
```bash
npm install
```

3. **Setup environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run database migrations:**
```bash
npm run migration:run
```

5. **Run tests:**
```bash
npm run test
```

6. **Start development server:**
```bash
npm run start:dev
```

### Working with Contracts

For `bridgelet-core`:

```bash
# Clone
git clone https://github.com/bridgelet-org/bridgelet-core.git
cd bridgelet-core

# Build
./scripts/build.sh

# Test
cargo test

# Deploy to testnet
./scripts/deploy-testnet.sh
```

---

## Project Structure

### bridgelet-sdk/

```
src/
├── modules/
│   ├── accounts/          # Account management
│   │   ├── accounts.controller.ts
│   │   ├── accounts.service.ts
│   │   ├── accounts.module.ts
│   │   └── dto/
│   ├── claims/            # Claim processing
│   ├── sweeps/            # Sweep orchestration
│   ├── webhooks/          # Event notifications
│   └── stellar/           # Blockchain integration
├── common/
│   ├── guards/            # Auth guards
│   ├── interceptors/      # Request/response interceptors
│   ├── filters/           # Exception filters
│   └── decorators/        # Custom decorators
├── config/                # Configuration
└── database/              # Entities, migrations
```

### bridgelet-core/

```
contracts/
├── ephemeral_account/
│   ├── src/
│   │   ├── lib.rs         # Main contract
│   │   ├── storage.rs     # State management
│   │   ├── events.rs      # Event definitions
│   │   └── errors.rs      # Error types
│   └── Cargo.toml
└── sweep_controller/
    └── src/
```

---

## Coding Standards

### TypeScript (SDK)

**Style Guide:**
- Use TypeScript strict mode
- Follow Airbnb style guide (with ESLint)
- Prefer functional programming patterns
- Use async/await over promises chains
- Document public APIs with JSDoc

**Example:**
```typescript
/**
 * Creates an ephemeral Stellar account
 * @param data Account creation parameters
 * @returns Created account details
 * @throws InsufficientBalanceError if funding account lacks funds
 */
async createAccount(data: CreateAccountDto): Promise<Account> {
  // Implementation
}
```

**Naming Conventions:**
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` (no `I` prefix)
- Files: `kebab-case.ts`

### Rust (Core Contracts)

**Style Guide:**
- Follow official Rust style guide
- Run `cargo fmt` before committing
- Run `cargo clippy` and fix warnings
- Document public functions

**Example:**
```rust
/// Records an inbound payment to the ephemeral account
/// 
/// # Arguments
/// * `env` - Soroban environment
/// * `amount` - Payment amount
/// * `asset` - Asset address
/// 
/// # Errors
/// Returns `Error::PaymentAlreadyReceived` if payment already recorded
pub fn record_payment(env: Env, amount: i128, asset: Address) -> Result<(), Error> {
    // Implementation
}
```

### General Principles

1. **KISS (Keep It Simple):** Prefer simple, readable code over clever solutions
2. **DRY (Don't Repeat Yourself):** Extract common logic into reusable functions
3. **YAGNI (You Aren't Gonna Need It):** Don't add features speculatively
4. **Separation of Concerns:** Each module has single, well-defined responsibility
5. **Error Handling:** Always handle errors explicitly, never swallow them

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config)
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Scope (optional):**
- `accounts`, `claims`, `webhooks`, `contracts`, `docs`, etc.

**Examples:**
```
feat(accounts): add batch account creation endpoint

Implements bulk account creation API that accepts array of account
specifications and creates them efficiently in parallel.

Closes #42
```

```
fix(claims): prevent double claim with race condition

Added database-level unique constraint on claim_token_hash to prevent
concurrent claim attempts from succeeding.

Fixes #78
```

```
docs(readme): update installation instructions

Added troubleshooting section for common setup issues.
```

### Commit Best Practices

- Keep commits atomic (one logical change per commit)
- Write clear, descriptive commit messages
- Reference issues/PRs when relevant
- Squash fixup commits before merging

---

## Pull Request Process

### Before Submitting

1. **Create an issue first** (for non-trivial changes)
2. **Fork the repository** and create feature branch
3. **Write tests** for your changes
4. **Update documentation** if needed
5. **Run tests locally:** `npm run test`
6. **Run linter:** `npm run lint`
7. **Ensure build succeeds:** `npm run build`

### Submitting PR

1. **Use PR template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Tests pass locally
- [ ] Linter passes
- [ ] Documentation updated
- [ ] Commits follow guidelines
```

2. **Link related issues:**
```markdown
Closes #42
Relates to #38
```

3. **Request review** from maintainers

### Review Process

**Reviewers will check:**
- Code quality and style
- Test coverage
- Documentation completeness
- Breaking changes (if any)
- Security implications

**Response to feedback:**
- Address all review comments
- Push additional commits (don't force push during review)
- Mark conversations as resolved when addressed

### Merging

**Requirements:**
- At least 1 approval from maintainer
- All tests passing (CI)
- No merge conflicts
- Branch up-to-date with main

**Merge strategy:**
- Small PRs: Squash and merge
- Large PRs: Merge commit (preserve history)

---

## Testing Guidelines

### Unit Tests

**Every module should have:**
- Service layer tests (business logic)
- Controller tests (API endpoints)
- Utility function tests

**Example:**
```typescript
describe('AccountsService', () => {
  let service: AccountsService;
  let mockBridgelet: jest.Mocked<BridgeletClient>;

  beforeEach(() => {
    mockBridgelet = createMockBridgeletClient();
    service = new AccountsService(mockBridgelet);
  });

  describe('createAccount', () => {
    it('should create account successfully', async () => {
      // Arrange
      const input = createMockAccountData();
      mockBridgelet.accounts.create.mockResolvedValue(mockAccount);

      // Act
      const result = await service.createAccount(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.accountId).toBe(mockAccount.accountId);
    });

    it('should throw on insufficient balance', async () => {
      // Arrange
      mockBridgelet.accounts.create.mockRejectedValue(
        new InsufficientBalanceError()
      );

      // Act & Assert
      await expect(service.createAccount(input))
        .rejects.toThrow(InsufficientBalanceError);
    });
  });
});
```

### Integration Tests

**Test complete flows:**
- Account creation → funding → claiming → sweep
- Webhook delivery
- Error scenarios

**Run with:**
```bash
npm run test:e2e
```

### Contract Tests

**Rust tests:**
```rust
#[test]
fn test_sweep_authorization() {
    let env = Env::default();
    let contract = create_contract(&env);
    
    // Setup
    contract.initialize(...);
    contract.record_payment(...);
    
    // Test sweep with authorized destination
    let result = contract.sweep(&destination, &auth_sig);
    assert_eq!(result, Ok(()));
}

#[test]
fn test_double_payment_rejected() {
    // Test that second payment fails
}
```

### Coverage Requirements

- **SDK:** Minimum 80% coverage
- **Contracts:** Minimum 90% coverage
- **Critical paths:** 100% coverage (claims, sweeps)

**Check coverage:**
```bash
npm run test:cov
```

---

## Documentation

### Code Documentation

**Document:**
- All public APIs (JSDoc/Rustdoc)
- Complex logic and algorithms
- Non-obvious design decisions
- Security considerations

### README Updates

**Update when:**
- Adding new features
- Changing setup process
- Modifying API endpoints
- Deprecating functionality

### API Documentation

**Update Swagger/OpenAPI:**
- Add new endpoints
- Update request/response schemas
- Add examples
- Document error codes

### Guides

**Consider adding:**
- Tutorial for new feature
- Migration guide for breaking changes
- Troubleshooting section
- FAQ entries

---

## Security Issues

### Reporting Vulnerabilities

**DO NOT create public issues for security vulnerabilities.**

**Instead:**
1. Email: aminubabafatima8@gmail.com
2. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

**What to expect:**
- Acknowledgment within 48 hours
- Assessment and response within 7 days
- Coordinated disclosure timeline

### Security Best Practices

**When contributing:**
- Never commit secrets or private keys
- Validate all user inputs
- Use parameterized queries (no SQL injection)
- Handle sensitive data carefully
- Follow principle of least privilege

---

## Community

### Communication Channels

- **GitHub Issues:** Bug reports, feature requests
- **GitHub Discussions:** Questions, ideas, show & tell
- **Stellar Discord:** `#bridgelet` channel
- **Email:** aminubabafatima8@gmail.com

### Getting Help

**Before asking:**
- Check documentation
- Search existing issues
- Review FAQ

**When asking:**
- Provide context and details
- Share error messages/logs
- Describe what you've tried
- Be patient and respectful

### Recognition

**Contributors are recognized:**
- In CONTRIBUTORS.md file
- In release notes
- On project website (future)
- GitHub contributor badge

---

## Development Workflow

### Typical Workflow

```bash
# 1. Create feature branch
git checkout -b feat/my-feature

# 2. Make changes
# ... code, code, code ...

# 3. Add and commit
git add .
git commit -m "feat(scope): description"

# 4. Run tests
npm run test
npm run lint

# 5. Push branch
git push origin feat/my-feature

# 6. Create PR on GitHub

# 7. Address review feedback

# 8. Squash commits if needed
git rebase -i main

# 9. Merge after approval
```

### Keeping Fork Updated

```bash
# Add upstream remote (once)
git remote add upstream https://github.com/bridgelet-org/bridgelet-sdk.git

# Fetch and merge
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

---

## Release Process

(For maintainers)

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Release Checklist

- [ ] Update CHANGELOG.md
- [ ] Update version in package.json
- [ ] Tag release: `git tag v0.1.0`
- [ ] Push tags: `git push --tags`
- [ ] GitHub release with notes
- [ ] Publish to npm (SDK client)
- [ ] Announce on Discord

---

## Questions?

If you have questions not covered here:
- Open a [GitHub Discussion](https://github.com/brufgelet-core/bridgelet/discussions)
- Ask in [Stellar Discord](https://discord.gg/stellardev) `#bridgelet`
- Email: bridgelet@example.com

---

**Thank you for contributing to Bridgelet!** 🚀

Every contribution, no matter how small, helps make crypto more accessible to everyone.