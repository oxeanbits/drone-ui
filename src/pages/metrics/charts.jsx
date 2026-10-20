import classNames from 'classnames/bind';
import React, { useState } from 'react';

import {
  STATUS_KEYS, formatBucketLabel, formatBucketTitle, formatHours, formatNumber,
} from './format';
import styles from './metrics.module.scss';

const cx = classNames.bind(styles);

const MAX_AXIS_LABELS = 14;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const SERIES_METRICS = {
  builds: {
    label: 'Builds',
    value: (bucket) => bucket.builds,
    format: formatNumber,
  },
  time: {
    label: 'Build time',
    value: (bucket) => bucket.build_seconds,
    format: formatHours,
  },
};

export function SeriesChart({ series, bucket }) {
  const [metricKey, setMetricKey] = useState('builds');
  const [hovered, setHovered] = useState(null);
  const metric = SERIES_METRICS[metricKey];
  const max = Math.max(1, ...series.map(metric.value));
  const labelEvery = Math.ceil(series.length / MAX_AXIS_LABELS);

  return (
    <div className={cx('chart')}>
      <div className={cx('chart-toolbar')}>
        <div className={cx('segmented')}>
          {Object.entries(SERIES_METRICS).map(([key, item]) => (
            <button
              type="button"
              key={key}
              className={cx('segmented-btn', { 'segmented-btn-active': key === metricKey })}
              onClick={() => setMetricKey(key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {hovered ? (
          <div className={cx('chart-details')}>
            <strong>{formatBucketTitle(hovered.start, bucket)}</strong>
            <span>{`${formatNumber(hovered.builds)} builds`}</span>
            {STATUS_KEYS.map((key) => (hovered[key] ? (
              <span key={key} className={cx('legend-item')}>
                <i className={cx('swatch', `swatch-${key}`)} />
                {`${hovered[key]} ${key}`}
              </span>
            ) : null))}
            <span>{`${formatHours(hovered.build_seconds)} build time`}</span>
          </div>
        ) : (
          <div className={cx('chart-details')}>
            {metricKey === 'builds' ? STATUS_KEYS.map((key) => (
              <span key={key} className={cx('legend-item')}>
                <i className={cx('swatch', `swatch-${key}`)} />
                {key}
              </span>
            )) : <span>Total stage time on runners</span>}
          </div>
        )}
      </div>

      <div className={cx('chart-body')}>
        <div className={cx('chart-scale')}>
          <span>{metric.format(max)}</span>
          <span>0</span>
        </div>
        <div className={cx('chart-plot')}>
          {series.map((item) => (
            <div
              key={item.start}
              className={cx('chart-col', { 'chart-col-hovered': hovered?.start === item.start })}
              onMouseEnter={() => setHovered(item)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className={cx('chart-stack')} style={{ height: `${(metric.value(item) / max) * 100}%` }}>
                {metricKey === 'builds'
                  ? STATUS_KEYS.map((key) => (item[key] ? (
                    <div key={key} className={cx('chart-segment', `swatch-${key}`)} style={{ flexGrow: item[key] }} />
                  ) : null))
                  : <div className={cx('chart-segment', 'swatch-time')} style={{ flexGrow: 1 }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={cx('chart-axis')}>
        {series.map((item, index) => (
          <span key={item.start}>
            {index % labelEvery === 0 ? formatBucketLabel(item.start, bucket) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

const heatColor = (value, max) => (value ? `rgba(2, 120, 213, ${0.12 + (value / max) * 0.88})` : undefined);

const LEGEND_STEPS = [0, 0.25, 0.5, 0.75, 1];

const findPeak = (data) => {
  let peak = null;
  data.forEach((row, day) => row.forEach((value, hour) => {
    if (value && (!peak || value > peak.value)) peak = { day, hour, value };
  }));
  return peak;
};

export function Heatmap({ data }) {
  const max = Math.max(1, ...data.flat());
  const totals = data.map((row) => row.reduce((sum, value) => sum + value, 0));
  const maxTotal = Math.max(1, ...totals);
  const peak = findPeak(data);

  return (
    <>
      <div className={cx('heatmap')}>
        <span />
        {HOURS.map((hour) => (
          <span key={hour} className={cx('heatmap-hour')}>{hour}</span>
        ))}
        <span className={cx('heatmap-hour', 'heatmap-total-head')}>Total</span>
        {data.map((row, day) => (
          <React.Fragment key={WEEKDAYS[day]}>
            <span className={cx('heatmap-day')}>{WEEKDAYS[day]}</span>
            {row.map((value, hour) => (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={hour}
                className={cx('heatmap-cell')}
                style={{ backgroundColor: heatColor(value, max) }}
                title={`${WEEKDAYS[day]} ${String(hour).padStart(2, '0')}:00 – ${value} builds`}
              />
            ))}
            <span className={cx('heatmap-total')} title={`${totals[day]} builds on ${WEEKDAYS[day]}`}>
              <span className={cx('heatmap-total-bar')} style={{ width: `${(totals[day] / maxTotal) * 100}%` }} />
              <span className={cx('heatmap-total-value')}>{formatNumber(totals[day])}</span>
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className={cx('heatmap-footer')}>
        <span>
          {peak
            ? `Peak: ${WEEKDAYS[peak.day]} ${String(peak.hour).padStart(2, '0')}:00 · ${formatNumber(peak.value)} builds`
            : 'No builds in this period.'}
        </span>
        <span className={cx('heatmap-legend')}>
          Less
          {LEGEND_STEPS.map((step) => (
            <i key={step} className={cx('heatmap-cell', 'heatmap-legend-cell')} style={{ backgroundColor: heatColor(step * max, max) }} />
          ))}
          More
        </span>
      </div>
    </>
  );
}
