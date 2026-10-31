// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { StateroomsTable } from './staterooms-table.tsx';

const ROWS = [{ stateroom: '5047', checked: true }, { stateroom: '5065' }, { stateroom: '4080' }];

describe('StateroomsTable — header', () => {
  it('always renders the STATEROOM column header', () => {
    render(<StateroomsTable />);
    expect(screen.getByText('STATEROOM')).toBeInTheDocument();
  });

  it('renders the STATEROOM header with data rows', () => {
    render(<StateroomsTable rows={ROWS} />);
    expect(screen.getByText('STATEROOM')).toBeInTheDocument();
  });
});

describe('StateroomsTable — empty state', () => {
  it('shows the empty-state prompt when no rows are supplied', () => {
    render(<StateroomsTable />);
    expect(screen.getByText('Select a Stateroom Category')).toBeInTheDocument();
  });

  it('shows the empty-state prompt when rows is an empty array', () => {
    render(<StateroomsTable rows={[]} />);
    expect(screen.getByText('Select a Stateroom Category')).toBeInTheDocument();
  });

  it('renders no checkbox rows in the empty state', () => {
    render(<StateroomsTable />);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });
});

describe('StateroomsTable — default state (data rows)', () => {
  it('renders all stateroom numbers', () => {
    render(<StateroomsTable rows={ROWS} />);
    expect(screen.getByText('5047')).toBeInTheDocument();
    expect(screen.getByText('5065')).toBeInTheDocument();
    expect(screen.getByText('4080')).toBeInTheDocument();
  });

  it('renders a checkbox per row', () => {
    render(<StateroomsTable rows={ROWS} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(ROWS.length);
  });

  it('marks the checked row checkbox as checked', () => {
    render(<StateroomsTable rows={ROWS} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('marks unchecked row checkboxes as unchecked', () => {
    render(<StateroomsTable rows={ROWS} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[1]).toHaveAttribute('aria-checked', 'false');
    expect(checkboxes[2]).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onRowChange when a checkbox is toggled', () => {
    const onRowChange = vi.fn();
    render(<StateroomsTable rows={ROWS} onRowChange={onRowChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1] as HTMLElement);
    expect(onRowChange).toHaveBeenCalledWith('5065', true);
  });
});

describe('StateroomsTable — GTY-only state', () => {
  const GTY_ROWS = [{ stateroom: 'GTY' }];

  it('renders the GTY stateroom row', () => {
    render(<StateroomsTable rows={GTY_ROWS} isGtyOnly />);
    expect(screen.getByText('GTY')).toBeInTheDocument();
  });

  it('shows the Guarantee Only alert title', () => {
    render(<StateroomsTable rows={GTY_ROWS} isGtyOnly />);
    expect(screen.getByText('Guarantee Only')).toBeInTheDocument();
  });

  it('shows the GTY explanation message', () => {
    render(<StateroomsTable rows={GTY_ROWS} isGtyOnly />);
    expect(screen.getByText(/No physical staterooms are available/i)).toBeInTheDocument();
  });

  it('does NOT show the Guarantee alert when isGtyOnly is false', () => {
    render(<StateroomsTable rows={ROWS} />);
    expect(screen.queryByText('Guarantee Only')).not.toBeInTheDocument();
  });
});

describe('StateroomsTable — slot and HTML forwarding', () => {
  it('exposes data-slot for selector targeting', () => {
    const { container } = render(<StateroomsTable />);
    expect(container.querySelector('[data-slot="staterooms-table"]')).toBeTruthy();
  });

  it('forwards data-testid and additional HTML attributes', () => {
    render(<StateroomsTable data-testid="cabin-table" />);
    expect(screen.getByTestId('cabin-table')).toBeInTheDocument();
  });

  it('merges className without losing layout classes', () => {
    const { container } = render(<StateroomsTable className="my-extra" />);
    const el = container.querySelector('[data-slot="staterooms-table"]') as HTMLElement;
    expect(el.className).toContain('my-extra');
    expect(el.className).toContain('rounded-md');
  });

  // The card sits beside the deck plan and must match its height, so it takes the height its
  // container gives it instead of a fixed 540px; the room list scrolls inside that space.
  // jsdom has no layout, so the sizing contract is pinned by class.
  it("fills its container's height and scrolls the rooms inside it", () => {
    const { container } = render(<StateroomsTable />);
    const el = container.querySelector('[data-slot="staterooms-table"]') as HTMLElement;
    expect(el).toHaveClass('h-full');
    expect(el.className).not.toMatch(/h-\[540px\]/);
    const body = container.querySelector('[data-slot="staterooms-table-body"]');
    expect(body).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
  });
});
