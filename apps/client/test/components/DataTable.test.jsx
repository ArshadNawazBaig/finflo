/**
 * ui/DataTable — config-driven table: headers, custom cell renderers, loading
 * skeleton, empty state, and row-click.
 */
/* eslint-disable react/prop-types -- throwaway test icon component */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DataTable from '@/components/ui/DataTable';

const Icon = (props) => <svg data-testid="empty-icon" {...props} />;

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status', render: (row) => <span>{row.status.toUpperCase()}</span> },
];
const data = [
  { _id: '1', name: 'Alice', status: 'active' },
  { _id: '2', name: 'Bob', status: 'overdue' },
];

describe('DataTable', () => {
  it('renders headers, rows, and custom cell renderers', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument(); // custom render
    expect(screen.getByText('OVERDUE')).toBeInTheDocument();
  });

  it('shows the empty state when there is no data', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyState={{ icon: Icon, title: 'No members', description: 'Add one.' }}
      />,
    );
    expect(screen.getByText('No members')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('renders headers but no data rows while loading', () => {
    render(<DataTable columns={columns} data={data} loading skeletonRows={3} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('fires onRowClick with the clicked row', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Bob'));
    expect(onRowClick).toHaveBeenCalledWith(data[1], 1);
  });
});
