# Solarize Code Convention

This document describes the code design principles and style conventions that must be adhered to in the Solarize project.

## 1. Font Size Constraints

- **Minimum Font Size:** The minimum allowable font size class in styling is `text-[0.625rem]` (`10px` equivalent).
- **Unit Standard:** Use relative `rem` units (e.g. `text-[0.625rem]`, `text-xs`) for all text dimensions in the popup UI to ensure they scale dynamically when the user adjusts the font size setting. Do NOT use absolute pixel units (`px`) for styling text.

## 2. UI View Conventions

- **View Naming:** Composable view rendering functions (plain functions returning React/TSX elements, not full components) found in `src/app.tsx` and `src/program.tsx` must end with the `View` suffix instead of beginning with `render` (e.g., `headerView`, `modeCardView`, `siteRowView`, `preLoadingView`).

## 3. Architecture & State Modularity (Elm Architecture / tea-cup-fp)

- **Architecture Standard:** The application follows the Elm Architecture, implemented via `tea-cup-fp` and `fp-ts`. State is represented by a central `Model` and modified via action messages (`Msg`).
- **Logic Modularization:** Complex state transitions (such as initializing data and toggling settings) must delegate their logic to dedicated, pure sub-updater functions in `src/update.ts` (e.g., `handleInit`, `handleToggleGlobalEnabled`, `handleToggleSiteEnabled`).
- **Immutability:** Reducer functions must treat the `Model` state as immutable, returning a new state and a command (`[Model, Cmd<Msg>]`).

## 4. Data Verification & Storage Codecs

- **Storage Codecs:** Use `io-ts` codecs (`GlobalSettingCodec` and `SiteSettingCodec`, read through `decodeOr`) to decode and validate data read from browser storage, maintaining backward compatibility for legacy structures.

## 5. Testing Conventions

- **Vitest:** New or changed sub-updater functions, helpers and codecs need Vitest tests in the `test/` directory (e.g., `test/update.test.ts`, `test/solarized.test.ts`). The content script (`src/worker/content.ts`) is tested in `test/content.test.ts` against a simulated page (jsdom); add a case there when you change its behavior, and still check real sites by hand before a release.

## 6. Layout & Spacing (No Margin Rule)

- **No Margin Utility Usage:** Do NOT use margin utility classes (e.g., `mt-`, `mb-`, `mx-`, `my-`, `ml-`, `mr-`, `m-`) for layout element spacing.
- **Layout Spacing Standard:** Layout spacing between elements must be achieved using parent container `padding` (e.g., `pt-`, `pb-`, `pl-`, `pr-`, `p-`) or flexbox/grid layout properties like `gap-` (e.g., `gap-[12px]`). This keeps element sizing localized and prevents layout overlaps when DOM elements are toggled dynamically.
