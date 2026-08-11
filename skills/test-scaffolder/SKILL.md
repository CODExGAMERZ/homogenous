---
name: test-scaffolder
description: Scaffolds unit test suites for target TypeScript or JavaScript files.
version: 1.0.0
triggers:
  keywords: ["scaffold test", "write unit test", "add tests"]
  fileTypes: [".ts", ".js"]
requiresTools: ["read_file", "write_file"]
---
# Test Scaffolder Instructions

When creating unit test files:
1. Read the target implementation file using `read_file`.
2. Generate Node.js native test runner code (`import test from 'node:test'`).
3. Place generated test file in `test/unit/<name>.test.ts`.
