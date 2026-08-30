# Lovable Import Report

## Import Environment

- Source generator: Lovable
- Import date: 2026-08-29T18:00:18Z
- Harness version: 1.0.0
- Node version: 22.18
- Biome version: Version: 2.5.11
- Playwright version: 1.62.1
- Playwright browsers: Chromium only (verified via config)

## Configuration Checks

- `useExhaustiveDependencies` is: **Configured at error level**
- `useExhaustiveDependencies` verified with failing fixture: **Yes (verified successfully prior to import)**

## Checks

### npm status
- `npm ci`: PASS (found 0 vulnerabilities)
- `npm run build`: PASS

### 1. Float currency math
PASS - Found integer-cents variables in source:\n```\nsrc/routes/index.tsx:	subtotalCents: number;
src/routes/index.tsx:	taxCents: number;
src/routes/index.tsx:	totalCents: number;
src/routes/index.tsx:	const subtotalCents = useMemo(
src/routes/index.tsx:	const taxCents = Math.round(subtotalCents * 0.08);\n...\n```

### 2. data-testid coverage
PASS - Found 23 data-testids. Sample:\n```\nsrc/routes/index.tsx:						data-testid="order-confirmed"
src/routes/index.tsx:						data-testid="order-number"
src/routes/index.tsx:					<ul className="mt-6 divide-y" data-testid="order-items">
src/routes/index.tsx:							data-testid="order-total"
src/routes/index.tsx:						data-testid="new-order-button"\n...\n```

### 3. Typecheck baseline
Status: PASS\n```\n\n```

### 4. Lint baseline
Biome baseline: FAIL\n```\n
Checked 57 files in 83ms. No fixes applied.
Found 2 errors.
Found 1 warning.
Found 8 infos.
check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Some errors were emitted while running checks.
  \n```\n\nESLint baseline: FAIL\n```\n  10:19   error  Delete `␍`  prettier/prettier
  11:96   error  Delete `␍`  prettier/prettier
  12:35   error  Delete `␍`  prettier/prettier
  13:33   error  Delete `␍`  prettier/prettier
  14:5    error  Delete `␍`  prettier/prettier
  15:4    error  Delete `␍`  prettier/prettier

✖ 3721 problems (3715 errors, 6 warnings)
  3715 errors and 0 warnings potentially fixable with the `--fix` option.\n```

### 5. Banned patterns
FAIL - Found banned patterns:\n```\nsrc/routeTree.gen.ts:18:} as any)\n```

### 6. Dependencies
### Allowed Platform Dependencies
@hookform/resolvers, @radix-ui/react-accordion, @radix-ui/react-alert-dialog, @radix-ui/react-aspect-ratio, @radix-ui/react-avatar, @radix-ui/react-checkbox, @radix-ui/react-collapsible, @radix-ui/react-context-menu, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-hover-card, @radix-ui/react-label, @radix-ui/react-menubar, @radix-ui/react-navigation-menu, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-scroll-area, @radix-ui/react-select, @radix-ui/react-separator, @radix-ui/react-slider, @radix-ui/react-slot, @radix-ui/react-switch, @radix-ui/react-tabs, @radix-ui/react-toggle, @radix-ui/react-toggle-group, @radix-ui/react-tooltip, @tailwindcss/vite, @tanstack/react-query, @tanstack/react-router, @tanstack/react-start, @tanstack/router-plugin, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, input-otp, lucide-react, react, react-day-picker, react-dom, react-hook-form, react-resizable-panels, recharts, sonner, tailwind-merge, tailwindcss, tw-animate-css, vaul, vite-tsconfig-paths, zod

### Dependencies outside platform list
None
