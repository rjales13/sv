import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

const config: StorybookConfig = {
  // Serve the repo-level context/ directory so deck-plan SVGs load in stories.
  staticDirs: [{ from: '../../../context', to: '/context' }],
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // Colocated stories from the shopping app feature slices
    '../../shopping/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // Design-system stories live next to their components in @vas/ui, so a
    // component and its story move together and neither can be renamed alone.
    '../../../packages/ui/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/react-vite',
  viteFinal: (viteConfig) => {
    /*
      Tailwind 4 has no PostCSS step — its Vite plugin is the compiler, and it
      is what turns `@vas/ui/globals.css` (imported in preview.tsx) into the
      real DS theme: Open Sans + the fjord/red palette + the `@source` scan of
      this app's stories. We append it rather than replace `plugins` so
      Storybook's own Vite plugins survive.

      We deliberately do NOT add `@vitejs/plugin-react` here: the
      `@storybook/react-vite` framework already applies it, and a second React
      plugin double-applies Fast Refresh / the JSX transform and breaks the
      build.
    */
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    viteConfig.resolve ??= {};
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias as Record<string, string> | undefined),
      // The shopping-app stories use `@/` (→ apps/shopping/src/). Storybook's
      // Vite config doesn't inherit the shopping-app alias, so we wire it here.
      '@': fileURLToPath(new URL('../../shopping/src', import.meta.url)),
      // `nuqs` and its sub-paths are installed in apps/storybook/node_modules
      // but pnpm's isolated-modules layout means they are not visible when
      // Rollup resolves from packages/ui stories. Explicit aliases point each
      // import to the concrete JS file so the exports map is bypassed.
      // Sub-paths must be listed BEFORE the bare `nuqs` entry: Vite applies
      // the first matching alias, and `nuqs` would otherwise shadow them.
      'nuqs/adapters/react': fileURLToPath(
        new URL('../node_modules/nuqs/dist/adapters/react.js', import.meta.url),
      ),
      nuqs: fileURLToPath(new URL('../node_modules/nuqs/dist/index.js', import.meta.url)),
    };
    return viteConfig;
  },
};

export default config;
