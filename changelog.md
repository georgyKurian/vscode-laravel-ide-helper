# Changelog

All notable changes to the "Laravel IDE Helper" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), 
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-22

### 🚀 Major Updates

#### Performance Improvements

* **10x faster extension loading** - Migrated to esbuild for production bundling
* **Reduced package size** - Extension now ships as a single optimized 16KB file (down from 500KB+)
* **Faster activation** - Bundle optimization with tree-shaking and minification
* **Parallel command execution** - New option to run multiple helpers simultaneously

#### Modern Codebase

* Migrated to modern ES modules and Node.js APIs
* Updated to TypeScript 5.9.x with strict type checking
* Modernized ESLint configuration (v9+)
* Updated all dependencies to latest stable versions
* Improved test infrastructure with better VS Code integration

### ✨ New Features

#### New Configuration Options

* `helper.debounceDelay` (default: 1000ms) - Configurable delay before running commands after file save
* `helper.parallelExecution` (default: true) - Run multiple commands in parallel for faster execution

#### Developer Experience

* Added comprehensive test suite with 23 unit tests
* Improved error handling and user feedback
* Better logging and debugging output
* Enhanced progress notifications with cancellation support

### 🔧 Technical Improvements

#### Build System

* Added esbuild for production bundling
* Optimized build scripts for faster development
* Separate test compilation strategy
* Improved watch mode for development

#### Code Quality

* Migrated from CommonJS to ES modules (`require()` → `import`)
* Updated to modern Node.js APIs (`node:path`,  `node:fs/promises`, etc.)
* Strict TypeScript configuration with proper type safety
* Better code organization and modularity

### 🐛 Bug Fixes

* Fixed race conditions with rapid file saves
* Improved debouncing logic to prevent unnecessary command runs
* Better handling of workspace without Laravel projects
* Fixed extension activation in edge cases

### 📦 Dependencies

* TypeScript: 5.2.x → 5.9.3
* ESLint: 8.x → 9.39.2
* VS Code Engine: ^1.85.0
* esbuild: Added 0.24.2
* Mocha: 10.x → 11.7.5
* Updated all @types packages to latest

### 🔄 Breaking Changes

* **Minimum VS Code version**: Now requires VS Code 1.85.0 or higher
* **Build output**: Extension now uses `dist/` for production and `out/` for tests (internal only)

### 📝 Documentation

* Added detailed build setup documentation
* Updated README with new configuration options
* Improved troubleshooting guide

---

## [1.1.0] - Previous Release

### Features

* Facade helper generation
* Model helper generation  
* Meta helper generation
* Run on save functionality
* Configurable PHP path
* Auto-clear console option

---

## How to Update

If you have the extension installed:
1. VS Code will automatically update to v2.0.0
2. No configuration changes required
3. New settings are optional with sensible defaults

## Feedback

Found a bug or have a feature request? Please [open an issue](https://github.com/georgyKurian/vscode-laravel-ide-helper/issues) on GitHub.
