# Copilot Instructions for iljar

## Repository Overview

This is the `iljar` repository - a minimal project in early stages of development. Currently, the repository contains only a basic README.md file.

## High-Level Details

- **Repository Type**: Early-stage project/library
- **Current State**: Minimal structure with README.md only
- **Languages**: Not yet determined (no code files present)
- **Frameworks**: Not yet determined
- **Target Runtime**: Not yet determined

## Build and Validation Instructions

### Current State
- No build system is currently configured
- No test framework is currently set up
- No linting tools are currently configured
- No continuous integration pipelines are currently in place

### When Adding New Components
- When adding code files, include appropriate build configuration for the chosen language/framework
- When adding dependencies, include a package manager configuration file (e.g., package.json, requirements.txt, go.mod)
- When adding test files, include instructions for running tests
- Always validate any new build steps by running them before committing

## Project Layout

### Current Structure
```
iljar/
├── .github/
│   └── copilot-instructions.md (this file)
└── README.md
```

### Future Considerations
- Configuration files should be placed in the repository root
- Source code should be organized in a `src/` or appropriate directory based on language conventions
- Tests should be placed in a `test/`, `tests/`, or `__tests__/` directory based on language conventions
- Documentation should be placed in a `docs/` directory or kept as Markdown files in the root

## Development Guidelines

### General Practices
- Follow language-specific best practices when code is added
- Maintain clean, readable code with appropriate comments
- Add tests for new functionality
- Update README.md when significant changes are made
- Keep dependencies minimal and well-justified

### Git Workflow
- All changes should be made through pull requests
- Commit messages should be clear and descriptive
- Keep commits focused and atomic

## Trust These Instructions

These instructions are accurate as of the current state of the repository. Only search for additional information if these instructions are incomplete or found to be incorrect as the repository evolves.
