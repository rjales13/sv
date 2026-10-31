// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../../test-setup.ts';
import { ExtensionDescription } from './extension-description.tsx';

const PARAGRAPH = "Discover the romantic charm of Verona, where Shakespeare's tales come to life.";

const BULLETS = [
  '3 hotel nights in Milan (as shown or similar)',
  '3 meals: 3 breakfasts (B)',
  '1 included tour: Historic Milan by Foot',
  'Services of a Viking Host',
  'All transfers',
];

describe('ExtensionDescription — paragraph variant', () => {
  it('renders the text content', () => {
    render(<ExtensionDescription text={PARAGRAPH} />);
    expect(screen.getByText(PARAGRAPH)).toBeInTheDocument();
  });

  it('renders as a paragraph element', () => {
    render(<ExtensionDescription text={PARAGRAPH} />);
    expect(screen.getByText(PARAGRAPH).tagName).toBe('P');
  });

  it('does not render a list when only text is provided', () => {
    render(<ExtensionDescription text={PARAGRAPH} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders both paragraph and list when both props are passed', () => {
    render(<ExtensionDescription text={PARAGRAPH} bullets={BULLETS} />);
    expect(screen.getByText(PARAGRAPH)).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});

describe('ExtensionDescription — bullets variant', () => {
  it('renders all bullet items', () => {
    render(<ExtensionDescription bullets={BULLETS} />);
    for (const item of BULLETS) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it('renders as a list', () => {
    render(<ExtensionDescription bullets={BULLETS} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders one listitem per bullet', () => {
    render(<ExtensionDescription bullets={BULLETS} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(BULLETS.length);
  });

  it('does not render a paragraph when only bullets are provided', () => {
    render(<ExtensionDescription bullets={BULLETS} />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });
});

describe('ExtensionDescription — slot and HTML forwarding', () => {
  it('exposes data-slot for selector targeting', () => {
    const { container } = render(<ExtensionDescription text={PARAGRAPH} />);
    expect(container.querySelector('[data-slot="extension-description"]')).toBeTruthy();
  });

  it('forwards className to the root element', () => {
    const { container } = render(<ExtensionDescription text={PARAGRAPH} className="extra" />);
    expect(container.firstChild).toHaveClass('extra');
  });

  it('forwards data-testid', () => {
    render(<ExtensionDescription text={PARAGRAPH} data-testid="desc" />);
    expect(screen.getByTestId('desc')).toBeInTheDocument();
  });
});
