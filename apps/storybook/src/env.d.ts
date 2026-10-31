/*
  Ambient shim for side-effect stylesheet imports. The Storybook preview
  imports `@vas/ui/globals.css` (the DS token layer) so every story renders
  on the real theme; @tailwindcss/vite compiles it at build time. A stylesheet
  carries no TypeScript type, so without this declaration `tsc --noEmit` cannot
  resolve the import. The repo ships no other CSS-module typing, so it lives
  here rather than in @vas/ui (which this app must not modify).
*/
declare module '*.css';

/*
  Vite's `import.meta.env` ambient. @vas/ui components (e.g. icon.tsx's
  DEV-only guard) read it, and its declaration lives in that package's own
  vite-env.d.ts — outside this app's tsconfig program. The consuming app is
  meant to supply these types (per the note in @vas/ui/src/vite-env.d.ts),
  so we mirror the minimal shape here rather than pull the whole `vite/client`
  lib. Storybook's Vite build provides the real values.
*/
interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
