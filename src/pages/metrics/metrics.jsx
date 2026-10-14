import classNames from 'classnames/bind';
import React, { useCallback, useMemo, useRef } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';

import { useCustomTitle } from 'hooks';
import { useSystemMetrics } from 'hooks/swr';

import { Heatmap, SeriesChart } from './charts';
import Filters from './filters';
import {
  TIMEZONE, buildQuery, failures, formatDuration, formatEvent, formatHours, formatNumber,
  formatPercent, formatRange, readParams, resolveRange, writeParams,
} from './format';
import styles from './metrics.module.scss';
import SortableTable from './table';

const cx = classNames.bind(styles);

const share = (total) => (row) => (total ? formatPercent(row.builds / total) : '–');

const repoColumns = (total) => [
  { key: 'slug', label: 'Repository', render: (row) => <Link to={`/${row.slug}`}>{row.slug || `#${row.repo_id}`}</Link> },
  {
    key: 'builds', label: 'Builds', numeric: true, render: (row) => formatNumber(row.builds),
  },
  {
    key: 'share', label: 'Share', numeric: true, sortValue: (row) => row.builds, render: share(total),
  },
  {
    key: 'avg_per_day', label: 'Avg / day', numeric: true, render: (row) => row.avg_per_day.toFixed(2),
  },
  {
    key: 'success_rate', label: 'Success', numeric: true, hint: 'Successful builds out of finished builds', render: (row) => formatPercent(row.success_rate),
  },
  {
    key: 'failures', label: 'Failed', numeric: true, hint: 'Failure, error and killed builds', sortValue: failures, render: (row) => formatNumber(failures(row)),
  },
  {
    key: 'avg_duration', label: 'Avg duration', numeric: true, render: (row) => formatDuration(row.avg_duration),
  },
  {
    key: 'p95_duration', label: 'P95 duration', numeric: true, render: (row) => formatDuration(row.p95_duration),
  },
  {
    key: 'avg_queue', label: 'Avg queue', numeric: true, hint: 'Time between build creation and start', render: (row) => formatDuration(row.avg_queue),
  },
  {
    key: 'build_seconds', label: 'Build time', numeric: true, hint: 'Total stage time on runners', render: (row) => formatHours(row.build_seconds),
  },
];

const eventColumns = (total) => [
  { key: 'event', label: 'Event', render: (row) => <span className={cx('capitalize')}>{formatEvent(row.event)}</span> },
  {
    key: 'builds', label: 'Builds', numeric: true, render: (row) => formatNumber(row.builds),
  },
  {
    key: 'share', label: 'Share', numeric: true, sortValue: (row) => row.builds, render: share(total),
  },
  {
    key: 'success_rate', label: 'Success', numeric: true, render: (row) => formatPercent(row.success_rate),
  },
  {
    key: 'avg_duration', label: 'Avg duration', numeric: true, render: (row) => formatDuration(row.avg_duration),
  },
  {
    key: 'build_seconds', label: 'Build time', numeric: true, render: (row) => formatHours(row.build_seconds),
  },
];

const runnerColumns = [
  { key: 'runner', label: 'Runner' },
  {
    key: 'stages', label: 'Stages', numeric: true, render: (row) => formatNumber(row.stages),
  },
  {
    key: 'success_rate', label: 'Success', numeric: true, render: (row) => formatPercent(row.success_rate),
  },
  {
    key: 'avg_duration', label: 'Avg stage', numeric: true, render: (row) => formatDuration(row.avg_duration),
  },
  {
    key: 'busy_seconds', label: 'Busy time', numeric: true, render: (row) => formatHours(row.busy_seconds),
  },
  {
    key: 'avg_concurrency', label: 'Avg concurrency', numeric: true, hint: 'Average number of stages running at the same time', render: (row) => row.avg_concurrency.toFixed(2),
  },
];

export default function Metrics() {
  useCustomTitle('Metrics');
  const location = useLocation();
  const history = useHistory();

  const params = useMemo(() => readParams(location.search), [location.search]);
  const range = useMemo(() => resolveRange(params), [params]);
  const query = range.error ? null : buildQuery(range, params);

  const {
    data, isError, isValidating, mutate,
  } = useSystemMetrics(query);

  // keep showing the previous report while a new one loads, to
  // avoid the page collapsing every time a filter changes.
  const lastReport = useRef(null);
  if (data) lastReport.current = data;
  const report = data || lastReport.current;

  const handleChange = useCallback((patch) => {
    history.replace({ search: writeParams({ ...params, ...patch }) });
  }, [history, params]);

  const summary = report?.summary;

  return (
    <div className={cx('page')}>
      <header className={cx('header')}>
        <div>
          <h1>Build Metrics</h1>
          {!range.error && (
            <p className={cx('subtitle')}>
              {formatRange(range)}
              {' · '}
              {TIMEZONE}
              {report ? ` · grouped by ${report.bucket}` : ''}
            </p>
          )}
        </div>
        <button type="button" className={cx('refresh-btn')} disabled={!query || isValidating} onClick={() => mutate()}>
          {isValidating ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      <Filters
        params={params}
        range={range.error ? null : range}
        repos={report?.available_repos ?? []}
        onChange={handleChange}
      />

      {range.error && <div className={cx('message')}>{range.error}</div>}
      {isError && <div className={cx('message', 'message-error')}>{isError.message || 'Unable to load metrics.'}</div>}
      {!report && !isError && !range.error && <div className={cx('message')}>Loading metrics…</div>}

      {report && (
        <div className={cx('content', { 'content-stale': isValidating })}>
          <div className={cx('cards')}>
            <Card label="Builds" value={formatNumber(summary.builds)} detail={`${summary.avg_per_day.toFixed(2)} per day`} />
            <Card
              label="Success rate"
              value={formatPercent(summary.success_rate)}
              detail={`${formatNumber(failures(summary))} failed`}
              tone="success"
            />
            <Card label="Avg duration" value={formatDuration(summary.avg_duration)} detail={`p95 ${formatDuration(summary.p95_duration)}`} />
            <Card label="Avg queue time" value={formatDuration(summary.avg_queue)} detail={`p95 ${formatDuration(summary.p95_queue)}`} tone="queued" />
            <Card label="Build time" value={formatHours(summary.build_seconds)} detail="stage time on runners" />
            <Card label="Repositories" value={formatNumber(report.repos.length)} detail={`${formatNumber(report.runners.length)} runners`} />
          </div>

          <Panel title="Builds over time">
            <SeriesChart series={report.series} bucket={report.bucket} />
          </Panel>

          <Panel title="Repositories" count={`${report.repos.length} total`}>
            <SortableTable
              columns={repoColumns(summary.builds)}
              rows={report.repos}
              rowKey={(row) => row.repo_id}
              defaultSort="builds"
              emptyMessage="No builds in this period."
            />
          </Panel>

          <div className={cx('columns')}>
            <Panel title="Events" count={`${report.events.length} total`}>
              <SortableTable
                columns={eventColumns(summary.builds)}
                rows={report.events}
                rowKey={(row) => row.event}
                defaultSort="builds"
                emptyMessage="No builds in this period."
              />
            </Panel>
            <Panel title="Runners" count={`${report.runners.length} total`}>
              <SortableTable
                columns={runnerColumns}
                rows={report.runners}
                rowKey={(row) => row.runner}
                defaultSort="busy_seconds"
                emptyMessage="No stages ran in this period."
              />
            </Panel>
          </div>

          <Panel title="Busiest hours" count="builds created by weekday and hour">
            <Heatmap data={report.heatmap} />
          </Panel>
        </div>
      )}
    </div>
  );
}

function Card({
  label, value, detail, tone = 'neutral',
}) {
  return (
    <div className={cx('card', `card-${tone}`)}>
      <span className={cx('card-label')}>{label}</span>
      <strong className={cx('card-value')}>{value}</strong>
      <span className={cx('card-detail')}>{detail}</span>
    </div>
  );
}

function Panel({ title, count, children }) {
  return (
    <section className={cx('panel')}>
      <div className={cx('panel-header')}>
        <h3>{title}</h3>
        {count && <span>{count}</span>}
      </div>
      {children}
    </section>
  );
}
