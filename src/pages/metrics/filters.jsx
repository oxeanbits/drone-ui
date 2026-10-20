import classNames from 'classnames/bind';
import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';

import {
  BUCKETS, PRESETS, formatNumber, toDateInput,
} from './format';
import styles from './metrics.module.scss';

const cx = classNames.bind(styles);

// keep in sync with .repo-picker-panel width.
const PICKER_PANEL_WIDTH = 380;

export default function Filters({
  params, range, repos, onChange,
}) {
  const [from, setFrom] = useState(params.from);
  const [to, setTo] = useState(params.to);

  // mirror the resolved preset range in the date inputs, so a
  // preset can be used as the starting point for a custom range.
  useEffect(() => {
    if (params.range === 'custom') {
      setFrom(params.from);
      setTo(params.to);
    } else if (range?.start) {
      setFrom(toDateInput(range.start));
      setTo(toDateInput(new Date(range.end.getTime() - 1)));
    }
  }, [params.range, params.from, params.to, range]);

  const applyCustom = (nextFrom, nextTo) => {
    setFrom(nextFrom);
    setTo(nextTo);
    if (nextFrom && nextTo) {
      onChange({ range: 'custom', from: nextFrom, to: nextTo });
    }
  };

  return (
    <div className={cx('filters')}>
      <div className={cx('filter-group')}>
        <span className={cx('filter-label')}>Period</span>
        <div className={cx('segmented')}>
          {PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.value}
              className={cx('segmented-btn', { 'segmented-btn-active': params.range === preset.value })}
              onClick={() => onChange({ range: preset.value, from: '', to: '' })}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cx('filter-group')}>
        <span className={cx('filter-label')}>From</span>
        <input
          type="date"
          className={cx('date-input', { 'date-input-active': params.range === 'custom' })}
          value={from}
          max={to || undefined}
          onChange={(event) => applyCustom(event.target.value, to)}
        />
        <span className={cx('filter-label')}>To</span>
        <input
          type="date"
          className={cx('date-input', { 'date-input-active': params.range === 'custom' })}
          value={to}
          min={from || undefined}
          onChange={(event) => applyCustom(from, event.target.value)}
        />
      </div>

      <div className={cx('filter-group')}>
        <span className={cx('filter-label')}>Group by</span>
        <select
          className={cx('select')}
          value={params.bucket}
          onChange={(event) => onChange({ bucket: event.target.value })}
        >
          {BUCKETS.map((bucket) => (
            <option key={bucket.value} value={bucket.value}>{bucket.label}</option>
          ))}
        </select>
      </div>

      <RepoPicker
        repos={repos}
        excluded={params.exclude}
        onChange={(exclude) => onChange({ exclude })}
      />
    </div>
  );
}

function RepoPicker({ repos, excluded, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // open the panel towards the side with room for it, so it never
  // covers the sidebar or overflows the window.
  const handleToggle = () => {
    if (!isOpen && ref.current) {
      const { left } = ref.current.getBoundingClientRect();
      setAlignRight(left + PICKER_PANEL_WIDTH > window.innerWidth);
    }
    setIsOpen(!isOpen);
  };

  const excludedSet = useMemo(() => new Set(excluded), [excluded]);
  const selectedCount = repos.filter((repo) => !excludedSet.has(repo.repo_id)).length;
  const filtered = repos.filter((repo) => repo.slug.toLowerCase().includes(search.toLowerCase()));

  let summary = `All (${repos.length})`;
  if (excluded.length) summary = `${selectedCount} of ${repos.length}`;

  const toggle = (id) => {
    onChange(excludedSet.has(id)
      ? excluded.filter((item) => item !== id)
      : [...excluded, id]);
  };
  const only = (id) => onChange(repos.map((repo) => repo.repo_id).filter((item) => item !== id));

  return (
    <div className={cx('filter-group', 'repo-picker')} ref={ref}>
      <span className={cx('filter-label')}>Repositories</span>
      <button
        type="button"
        className={cx('select', 'repo-picker-btn', { 'repo-picker-btn-filtered': excluded.length })}
        onClick={handleToggle}
      >
        {summary}
      </button>
      {isOpen && (
        <div className={cx('repo-picker-panel', { 'repo-picker-panel-right': alignRight })}>
          <input
            type="search"
            className={cx('repo-picker-search')}
            placeholder="Filter repositories"
            value={search}
            autoFocus
            onChange={(event) => setSearch(event.target.value)} // eslint-disable-line jsx-a11y/no-autofocus
          />
          <div className={cx('repo-picker-actions')}>
            <button type="button" onClick={() => onChange([])}>Select all</button>
            <button type="button" onClick={() => onChange(repos.map((repo) => repo.repo_id))}>Select none</button>
          </div>
          <ul className={cx('repo-picker-list')}>
            {filtered.map((repo) => (
              <li key={repo.repo_id}>
                <label className={cx('repo-picker-item')} htmlFor={`metrics-repo-${repo.repo_id}`}>
                  <input
                    id={`metrics-repo-${repo.repo_id}`}
                    type="checkbox"
                    checked={!excludedSet.has(repo.repo_id)}
                    onChange={() => toggle(repo.repo_id)}
                  />
                  <span className={cx('repo-picker-slug')} title={repo.slug}>{repo.slug}</span>
                  <span className={cx('repo-picker-count')}>{formatNumber(repo.builds)}</span>
                </label>
                <button type="button" className={cx('repo-picker-only')} onClick={() => only(repo.repo_id)}>
                  only
                </button>
              </li>
            ))}
            {!filtered.length && <li className={cx('empty')}>No repositories with builds in this period.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
