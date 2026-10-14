import classNames from 'classnames/bind';
import React, { useMemo, useState } from 'react';

import styles from './metrics.module.scss';

const cx = classNames.bind(styles);

const ROWS_SHOWN = 15;

const compare = (left, right) => {
  if (typeof left === 'string' || typeof right === 'string') {
    return String(left ?? '').localeCompare(String(right ?? ''));
  }
  return (left ?? 0) - (right ?? 0);
};

// SortableTable renders rows sorted descending by the default
// column. Clicking a header sorts by that column, starting with
// the highest values; clicking it again flips the direction.
export default function SortableTable({
  columns, rows, rowKey, defaultSort, emptyMessage, rowsShown = ROWS_SHOWN,
}) {
  const [sort, setSort] = useState({ key: defaultSort, desc: true });
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const column = columns.find((item) => item.key === sort.key);
    const value = column?.sortValue ?? ((row) => row[sort.key]);
    return rows.slice(0).sort((a, b) => {
      const result = compare(value(a), value(b));
      return sort.desc ? -result : result;
    });
  }, [columns, rows, sort]);

  const visible = showAll ? sorted : sorted.slice(0, rowsShown);

  const handleSort = (key) => setSort((current) => ({
    key,
    desc: current.key === key ? !current.desc : true,
  }));

  if (!rows.length) {
    return <div className={cx('empty')}>{emptyMessage}</div>;
  }

  return (
    <>
      <div className={cx('table-scroll')}>
        <table className={cx('table')}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cx({ numeric: column.numeric })}>
                  <button
                    type="button"
                    className={cx('sort-btn', { 'sort-btn-active': sort.key === column.key })}
                    title={column.hint}
                    onClick={() => handleSort(column.key)}
                  >
                    {column.label}
                    <span className={cx('sort-arrow')}>
                      {sort.key === column.key && (sort.desc ? '▼' : '▲')}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={cx({ numeric: column.numeric })}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > rowsShown && (
        <button type="button" className={cx('show-more')} onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show less' : `Show all ${sorted.length}`}
        </button>
      )}
    </>
  );
}
