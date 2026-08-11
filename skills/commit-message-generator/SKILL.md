---
name: commit-message-generator
description: Generates conventional git commit messages based on git diff working directory status.
version: 1.0.0
triggers:
  keywords: ["commit message", "git commit", "generate commit"]
  fileTypes: []
requiresTools: ["git_diff", "git_status"]
---
# Commit Message Generator Instructions

When generating git commit messages:
1. Run `git_status` and `git_diff` to analyze modified lines.
2. Follow Conventional Commits format: `<type>(<scope>): <short summary>`.
3. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
4. Keep title under 72 characters.
