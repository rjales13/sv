import figma from '@figma/code-connect';
import { SubSectionTitle } from './sub-section-title.tsx';

/*
  Code Connect for SubSectionTitle — ShoppingApp_UX-VD, node 1282-155103.
  "Property 1" pairs a state with the section it titles:
    expanded / collapsed                   → "Contact details"
    info&prefe-expanded / infopref-collapsed → "Info & preferences" (no Edit layer)
  Button (boolean) → onEdit passed; Edit only ever shows on the expanded Contact details title.
*/

const URL =
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1282-155103';

figma.connect(SubSectionTitle, URL, {
  variant: { 'Property 1': 'expanded', Button: true },
  example: () => <SubSectionTitle title="Contact details" onEdit={() => {}} />,
});

figma.connect(SubSectionTitle, URL, {
  variant: { 'Property 1': 'expanded', Button: false },
  example: () => <SubSectionTitle title="Contact details" />,
});

figma.connect(SubSectionTitle, URL, {
  variant: { 'Property 1': 'collapsed' },
  example: () => <SubSectionTitle title="Contact details" expanded={false} />,
});

figma.connect(SubSectionTitle, URL, {
  variant: { 'Property 1': 'info&prefe-expanded' },
  example: () => <SubSectionTitle title="Info & preferences" />,
});

figma.connect(SubSectionTitle, URL, {
  variant: { 'Property 1': 'infopref-collapsed' },
  example: () => <SubSectionTitle title="Info & preferences" expanded={false} />,
});
