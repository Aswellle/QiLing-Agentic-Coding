---
name: verify
description: Run type check, lint, and tests — then fix any failures found
---

# Verify: Type Check + Lint + Tests

Run all verification checks and fix any failures found.

## Steps

1. **Detect project type and test commands**
   - Check for `package.json` scripts (test, typecheck, lint)
   - Check for `Makefile` targets
   - Common commands: `bun test`, `npm test`, `pytest`, `go test`, `cargo test`

2. **Run type checking** (if applicable)
   - TypeScript: `bun run typecheck` or `tsc --noEmit`
   - Python: `mypy .`
   - Go: `go vet ./...`

3. **Run linter** (if applicable)
   - JS/TS: `bun run lint` or `npx biome check src/` or `eslint .`
   - Python: `ruff check .`
   - Go: `golangci-lint run`

4. **Run test suite**
   - Run with the project's test command
   - If tests fail, diagnose root cause and fix

5. **Report results**
   - Summarize: N tests passed, M failed (fixed), lint clean, types OK
   - If anything cannot be fixed, explain why

## Rules
- Fix issues rather than suppressing them
- Do not add `// @ts-ignore` or similar workarounds without explaining why
- If a test was already failing before your changes, note it but don't fix it (out of scope)
