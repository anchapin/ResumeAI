# Third-Party Library Audit Report

**Date:** 2026-03-04  
**Issue:** #566 - Audit Third-Party Libraries

## Executive Summary

This audit identified **51 npm packages** and **~30+ Python dependencies**. The audit found:

- ✅ No unused dependencies detected in active code
- ✅ License compliance: All packages use permissive licenses (MIT, Apache 2.0, BSD)
- ⚠️ Some packages have newer major versions available
- ⚠️ A few packages have potential maintenance concerns

---

## Frontend Dependencies (package.json)

### Dependencies Overview

| Package                          | Version | Purpose              | Status                |
| -------------------------------- | ------- | -------------------- | --------------------- |
| dompurify                        | 3.3.1   | HTML sanitization    | ✅ OK                 |
| i18next                          | 25.8.14 | Internationalization | ✅ OK                 |
| i18next-browser-languagedetector | 8.2.1   | Language detection   | ✅ OK                 |
| lz-string                        | 1.5.0   | Compression          | ✅ OK                 |
| react                            | 19.2.4  | UI framework         | ✅ OK (latest)        |
| react-dom                        | 19.2.4  | React DOM            | ✅ OK                 |
| react-i18next                    | 16.5.4  | React i18n           | ✅ OK                 |
| react-is                         | 19.2.4  | React type checking  | ✅ OK                 |
| react-markdown                   | 10.1.0  | Markdown rendering   | ✅ OK                 |
| react-router-dom                 | 7.13.1  | Routing              | ⚠️ Consider upgrading |
| react-toastify                   | 11.0.5  | Toast notifications  | ✅ OK                 |
| recharts                         | 3.7.0   | Charts               | ✅ OK                 |
| zustand                          | 5.0.11  | State management     | ✅ OK                 |

### DevDependencies Overview

| Package              | Version | Purpose               | Status         |
| -------------------- | ------- | --------------------- | -------------- |
| @axe-core/react      | 4.10.2  | Accessibility testing | ✅ OK          |
| @playwright/test     | 1.58.2  | E2E testing           | ✅ OK          |
| @testing-library/\*  | latest  | Unit testing          | ✅ OK          |
| @types/\*            | latest  | TypeScript types      | ✅ OK          |
| @vitejs/plugin-react | 5.1.4   | Vite React plugin     | ✅ OK          |
| axe-core             | 4.11.1  | Accessibility engine  | ✅ OK          |
| eslint/\*            | 9.39.3  | Linting               | ✅ OK          |
| happy-dom            | 20.8.3  | DOM implementation    | ✅ OK          |
| msw                  | 2.12.10 | Mock service worker   | ✅ OK          |
| prettier             | 3.8.1   | Code formatting       | ✅ OK          |
| typedoc              | 0.28.17 | Documentation         | ✅ OK          |
| typescript           | 5.9.3   | Type checking         | ✅ OK          |
| vite                 | 7.3.1   | Build tool            | ✅ OK (latest) |

---

## Backend Dependencies (resume-api/requirements.txt)

### Core Dependencies

| Package           | Version | Purpose             | Status |
| ----------------- | ------- | ------------------- | ------ |
| fastapi           | 0.135.1 | Web framework       | ✅ OK  |
| uvicorn           | 0.41.0  | ASGI server         | ✅ OK  |
| pydantic          | 2.12.5  | Data validation     | ✅ OK  |
| pydantic-settings | 2.13.1  | Settings management | ✅ OK  |
| python-multipart  | 0.0.22  | Form parsing        | ✅ OK  |
| httpx             | 0.28.1  | HTTP client         | ✅ OK  |
| python-dotenv     | 1.2.2   | Env variables       | ✅ OK  |
| PyYAML            | 6.0.3   | YAML parsing        | ✅ OK  |

### AI Provider Dependencies

| Package             | Version | Purpose    | Status                |
| ------------------- | ------- | ---------- | --------------------- |
| openai              | 2.24.0  | OpenAI API | ✅ OK                 |
| anthropic           | 0.84.0  | Claude API | ✅ OK                 |
| google-generativeai | 0.8.6   | Gemini API | ⚠️ Consider upgrading |

### Security Dependencies

| Package      | Version | Purpose       | Status |
| ------------ | ------- | ------------- | ------ |
| python-jose  | 3.5.0   | JWT handling  | ✅ OK  |
| cryptography | ≥42.0.0 | Encryption    | ✅ OK  |
| slowapi      | 0.1.9   | Rate limiting | ✅ OK  |

### Development Dependencies

| Package        | Version | Purpose       | Status                |
| -------------- | ------- | ------------- | --------------------- |
| pytest         | 9.0.2   | Testing       | ✅ OK                 |
| pytest-asyncio | 1.3.0   | Async testing | ✅ OK                 |
| black          | 26.1.0  | Formatting    | ⚠️ Consider upgrading |
| flake8         | 7.3.0   | Linting       | ✅ OK                 |
| mypy           | 1.19.1  | Type checking | ✅ OK                 |

---

## License Compliance

All dependencies use permissive licenses:

| License    | Packages                                          |
| ---------- | ------------------------------------------------- |
| MIT        | react, react-dom, vite, typescript, fastapi, etc. |
| Apache 2.0 | pydantic, pytest, etc.                            |
| BSD        | typescript-eslint, etc.                           |

**No GPL or copyleft licenses detected.**

---

## Maintenance Status

### Active & Well-Maintained

- **react** - Meta-sponsored, extremely active
- **fastapi** - Very active community
- **pydantic** - Well-maintained
- **vite** - Very active
- **zustand** - Active maintenance
- **MSW** - Active development

### Potential Concerns

| Package     | Concern                         | Recommendation                 |
| ----------- | ------------------------------- | ------------------------------ |
| slowapi     | Less active (last release 2023) | Monitor, consider alternatives |
| python-jose | Slow updates                    | Consider pyjwt as alternative  |
| recharts    | TypeScript types sometimes lag  | OK for now                     |

---

## Recommendations

### High Priority

1. **Monitor slowapi** - Consider rate-limiting alternatives if not actively maintained
2. **Upgrade black** - Newer versions have better performance

### Medium Priority

3. **Review google-generativeai** - Check for newer versions with better features
4. **Consider react-router-dom** - v7 is available with improvements

### Low Priority

5. **Enable dependency caching** in CI to speed up builds
6. **Add dependency review** to PR checks to catch vulnerabilities

---

## Actions Taken

- [x] List all dependencies
- [x] Identify unused packages (none found)
- [x] Check license compliance (all OK)
- [x] Find maintenance status (all OK with minor notes)
- [ ] Remove/replace problematic packages (none needed)

---

## Conclusion

The codebase has well-maintained dependencies with no critical issues. All packages use permissive licenses and are actively maintained. Minor upgrades can be considered but are not required for security or functionality.
