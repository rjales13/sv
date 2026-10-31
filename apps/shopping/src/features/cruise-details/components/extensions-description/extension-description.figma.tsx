import figma from '@figma/code-connect';
import { ExtensionDescription } from './extension-description';

// Figma file: ShoppingApp_UX-VD
// Node: 1786-171943 — COMPONENT_SET "ExtDescription"
// Variants: "long descr" (paragraph) | "bullet list" (disc list)

figma.connect(
  ExtensionDescription,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1786-171943',
  {
    variant: { 'Property 1': 'long descr' },
    example: () => (
      <ExtensionDescription text="Discover the romantic charm of Verona, where Shakespeare's tales come to life amidst stunning architecture and vibrant piazzas." />
    ),
  },
);

figma.connect(
  ExtensionDescription,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1786-171943',
  {
    variant: { 'Property 1': 'bullet list' },
    example: () => (
      <ExtensionDescription
        bullets={[
          '3 hotel nights in Milan (as shown or similar)',
          '3 meals: 3 breakfasts (B)',
          '1 included tour: Historic Milan by Foot',
          'Services of a Viking Host',
          'All transfers',
        ]}
      />
    ),
  },
);
