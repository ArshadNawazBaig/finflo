/* eslint-disable react/prop-types -- project convention: no propTypes (see EmptyState et al.) */
import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/EmptyState';

/**
 * @typedef {object} Column
 * @property {string} key - Row property key; also the React key for the column.
 * @property {React.ReactNode} [header] - Header label (defaults to `key`).
 * @property {(row: object, rowIndex: number) => React.ReactNode} [render] - Custom cell renderer.
 * @property {'left'|'center'|'right'} [align] - Cell/header text alignment.
 * @property {string} [className] - Extra classes on the body cell.
 * @property {string} [headerClassName] - Extra classes on the header cell.
 */

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };

/**
 * Config-driven table that standardises the `<thead>/<tbody>` markup,
 * loading skeleton, and empty state repeated across every listing page.
 * Composes the shadcn Table primitives — drop pagination beneath it as before.
 *
 * @param {object} props
 * @param {Column[]} props.columns - Column definitions.
 * @param {object[]} props.data - Row objects.
 * @param {boolean} [props.loading] - Show skeleton rows instead of data.
 * @param {number} [props.skeletonRows=5] - Number of skeleton rows while loading.
 * @param {(row: object, index: number) => (string|number)} [props.rowKey] - Stable row key.
 * @param {(row: object, index: number) => void} [props.onRowClick] - Row click handler (adds hover/cursor).
 * @param {{icon: React.ComponentType, title: string, description?: string, action?: React.ReactNode}} [props.emptyState]
 *   - Empty-state config; rendered when there's no data and not loading.
 * @param {React.ReactNode} [props.empty] - Custom empty node (overrides `emptyState`).
 * @param {string} [props.className] - Classes on the Table element.
 * @returns {JSX.Element}
 *
 * @example
 * <DataTable columns={[{ key: 'name', header: 'Name' }, { key: 'status', render: r => <StatusBadge status={r.status} /> }]}
 *   data={rows} loading={loading} onRowClick={r => open(r)}
 *   emptyState={{ icon: Users, title: 'No members', description: 'Add your first member.' }} />
 */
const DataTable = ({
  columns,
  data,
  loading,
  skeletonRows = 5,
  rowKey = (row, i) => row?._id ?? row?.id ?? i,
  onRowClick,
  emptyState,
  empty,
  className,
}) => {
  const headerCells = columns.map((col) => (
    <TableHead
      key={col.key}
      className={cn(
        'text-xs font-bold uppercase tracking-wider text-muted-foreground',
        ALIGN[col.align] || ALIGN.left,
        col.headerClassName,
      )}
    >
      {col.header ?? col.key}
    </TableHead>
  ));

  if (loading) {
    return (
      <Table className={className}>
        <TableHeader>
          <TableRow>{headerCells}</TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: skeletonRows }).map((_, r) => (
            <TableRow key={`sk-${r}`}>
              {columns.map((col) => (
                <TableCell key={col.key} className={ALIGN[col.align] || ALIGN.left}>
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (!data || data.length === 0) {
    if (empty) return empty;
    if (emptyState) {
      return (
        <EmptyState
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      );
    }
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No records found.
      </div>
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>{headerCells}</TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow
            key={rowKey(row, i)}
            onClick={onRowClick ? () => onRowClick(row, i) : undefined}
            className={cn(onRowClick && 'cursor-pointer')}
          >
            {columns.map((col) => (
              <TableCell
                key={col.key}
                className={cn(ALIGN[col.align] || ALIGN.left, col.className)}
              >
                {col.render ? col.render(row, i) : row[col.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default DataTable;
export { DataTable };
