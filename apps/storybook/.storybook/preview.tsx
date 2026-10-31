import type { Preview } from '@storybook/react-vite';
import { TooltipProvider } from '@vikings/ui/components/tooltip';
import '@vikings/ui/globals.css';

/*
  Viking DS Storybook preview. The DS token layer is imported once here so every
  story renders on the real theme (Open Sans, the fjord/red palette, the page
  surface). The system is light-only, so there is no theme toggle.

  This app documents the presentational @vikings/ui catalogue only — there is no
  API, so the reference app's MSW worker / react-query wiring is intentionally
  dropped. The a11y addon (`test: 'error'`) is the component-level accessibility
  surface (NFR2).
*/
const preview: Preview = {
  // Autodocs for every component from one place: each `Meta` gets an API table,
  // source, and description page without per-file opt-in.
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    options: {
      storySort: {
        order: ['Viking DS', ['Core', 'Forms', 'Status', 'Feedback', 'Surfaces', 'Patterns']],
      },
    },
    backgrounds: {
      options: {
        page: { name: 'Page (#F4F4F4)', value: '#F4F4F4' },
        surface: { name: 'Surface (white)', value: '#FFFFFF' },
        fjord: { name: 'Fjord (#0F3055)', value: '#0F3055' },
      },
    },
    // Desktop-only product — the DS ships 1920 designs with 3440 twins and no
    // mobile/tablet target, so the viewport ladder runs laptop → ultra-wide.
    viewport: {
      options: {
        laptop: { name: 'Laptop · 1280', styles: { width: '1280px', height: '800px' } },
        desktop: { name: 'Desktop · 1440', styles: { width: '1440px', height: '900px' } },
        hd: { name: 'HD · 1920', styles: { width: '1920px', height: '1080px' } },
        ultrawide: { name: 'Ultra-wide · 3440', styles: { width: '3440px', height: '1440px' } },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
    },
  },
  initialGlobals: {
    backgrounds: { value: 'page' },
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};

export default preview;
