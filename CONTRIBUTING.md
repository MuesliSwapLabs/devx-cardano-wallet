# Contributing to devx-cardano-wallet

Thank you for your interest in contributing! We welcome and appreciate your help in making **devx-cardano-wallet** better for everyone. This guide will walk you through how to set up your environment, report issues, and contribute code.

---

## Table of Contents

1. [Getting Started](#getting-started)  
2. [How to Contribute](#how-to-contribute)  
   - [Reporting Bugs](#reporting-bugs)  
   - [Suggesting Features](#suggesting-features)  
   - [Pull Requests](#pull-requests)  
3. [Development Setup](#development-setup)  
4. [Style Guidelines](#style-guidelines)  
5. [Testing](#testing)  
6. [Review Process](#review-process)  
7. [Thanks / Acknowledgements](#thanks-acknowledgements)

---

## Getting Started

1. Fork the repository  
2. Clone your fork locally:  
   ```bash
      git clone https://github.com/YOUR_USERNAME/devx-cardano-wallet.git
      cd devx-cardano-wallet
   ````
3. Install dependencies (we use [pnpm](https://pnpm.io/)):
   ```bash
   pnpm install
   ```
4. Start the dev server:
   ```bash
   pnpm dev
   ```
5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## How to Contribute

### Reporting Bugs

* Search the [issue tracker](https://github.com/MuesliSwapLabs/devx-cardano-wallet/issues) to avoid duplicates.
* If no existing issue matches, open a new one and include:

  * A clear description of the problem
  * Steps to reproduce
  * Expected vs actual behavior
  * Your environment (OS, browser, Node version)
  * Logs or screenshots if helpful

### Suggesting Features

* Open an issue with:

  * A description of the feature
  * Why it would be useful
  * Optional: ideas for implementation

### Pull Requests

* Create a branch from `main` (e.g. `feature/wallet-sync` or `fix/tx-signing-bug`).
* Make sure your code is tested and linted.
* Update documentation where needed.
* Push your branch and open a Pull Request against `main`.
* Reference related issues in your PR description.

---

## Development Setup

This project uses:

* [React + TypeScript](https://react.dev/) (frontend)
* [Vite](https://vitejs.dev/) (build tool)
* [pnpm](https://pnpm.io/) (package manager)
* [Vitest](https://vitest.dev/) for testing
* [ESLint + Prettier](https://eslint.org/) for linting & formatting

Useful commands:

```bash
# Start dev server
pnpm dev

# Run linting
pnpm lint

# Run tests
pnpm test

# Build production bundle
pnpm build
```

---

## Style Guidelines

* Follow the existing code style (TypeScript + Prettier).
* Use meaningful variable and function names.
* Keep components and functions focused and small.
* Document public functions and exported utilities.

---

## Testing

* Write tests for new features or bug fixes.
* Run the test suite before pushing changes:

  ```bash
  pnpm test
  ```
* Ensure tests cover edge cases and pass in CI.

---

## Review Process

* PRs will be reviewed by maintainers.
* Expect feedback and be open to requested changes.
* Once approved, a maintainer will merge the PR.

---

## Thanks / Acknowledgements

Thank you for helping to improve **devx-cardano-wallet**!
Your contributions—big or small—make a real difference.
