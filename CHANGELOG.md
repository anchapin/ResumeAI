# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-11

### Added
- Initial release
- Async PDF rendering system with job queue for improved scalability and timeout protection.
- Circuit breaker for AI providers to prevent cascading failures.
- OAuth PKCE implementation for enhanced security.
- Comprehensive test coverage for editor form components and App.tsx.
- Global frontend error handler with user-friendly messages.
- Consistent backend error response format with unique request IDs.
- API key security using Bcrypt hashing at rest.
- Exponential backoff with jitter for API retries.
- LocalStorage quota handling with data compression.
- 60% minimum code coverage enforcement for frontend and backend.
- Comprehensive API integration tests.

### Changed
- Migrated from GitHub CLI authentication to OAuth-based integration.
- Optimized Docker configuration for production and local development.
- Enhanced LaTeX escaping for PDF generation to prevent XSS and rendering errors.
- Updated Vitest and Vitest configuration to resolve module errors.

### Fixed
- Resolved git merge conflict markers in `errorHandler.ts`.
- Fixed `node:inspector/promises` module errors in test environments.
- Addressed API timeout issues by implementing frontend and backend protection.
- Fixed path traversal vulnerabilities in PDF download endpoints.

### Removed
- Deprecated GitHub CLI-related code and routes.
- Subprocess calls to `gh` CLI in the backend.
