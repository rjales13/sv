import figma from '@figma/code-connect';
import { ContactDetails } from './contact-details.tsx';

/*
  Code Connect for ContactDetails — ShoppingApp_UX-VD, node 1282-155123.
    Property 1: Default → expanded, with Edit · collapsed → expanded={false}
*/

const URL =
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1282-155123';

const EXAMPLE_CONTACT = {
  email: 'john371@outlook.com',
  phone: '(781) 283-10395',
  address: '45 PINECREST AVENUE, HARRISBURG, PA 1710, United States',
};

figma.connect(ContactDetails, URL, {
  variant: { 'Property 1': 'Default' },
  example: () => <ContactDetails contact={EXAMPLE_CONTACT} onEdit={() => {}} />,
});

figma.connect(ContactDetails, URL, {
  variant: { 'Property 1': 'collapsed' },
  example: () => <ContactDetails contact={EXAMPLE_CONTACT} expanded={false} />,
});
