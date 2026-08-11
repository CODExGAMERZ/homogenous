---
name: code-refactor
description: Modernizes TypeScript/JavaScript code, improving clarity and modularity.
version: 1.0.0
triggers:
  keywords: ["refactor", "modernize", "clean up code"]
  fileTypes: [".ts", ".js", ".tsx", ".jsx"]
requiresTools: ["read_file", "replace_file_content"]
---
# Code Refactor Instructions

When refactoring code:
1. Inspect code structure using `read_file`.
2. Extract monolithic functions into single-responsibility functions.
3. Use precise `replace_file_content` to apply changes cleanly.
