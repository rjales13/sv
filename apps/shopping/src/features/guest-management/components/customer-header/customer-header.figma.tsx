import figma from '@figma/code-connect';
import { CustomerHeader } from './customer-header.tsx';

/*
  Code Connect for CustomerHeader — ShoppingApp_UX-VD, node 1286-156084.
  No component properties: the guest and switch state are data.
*/

figma.connect(
  CustomerHeader,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1286-156084',
  {
    example: () => (
      <CustomerHeader
        guest={{
          name: 'Mr. John Smith Whitcombe',
          customerNumber: '100838606001',
          birthday: '5/23/1972',
        }}
        travelingAsMain
      />
    ),
  },
);
