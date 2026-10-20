import {
  addDays, addMonths, differenceInCalendarDays, format, getUnixTime, isValid, parseISO,
  startOfDay, startOfMonth, startOfWeek, subDays,
} from 'date-fns';

export const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// keep in sync with metricsMaxRange in the server.
export const MAX_RANGE_DAYS = 366;

export const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export const BUCKETS = [
  { value: 'auto', label: 'Auto' },
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export const STATUS_KEYS = ['success', 'failure', 'error', 'killed', 'other'];

export const DEFAULT_PARAMS = {
  range: '30d',
  from: '',
  to: '',
  bucket: 'auto',
  exclude: [],
};

const DATE_INPUT_FORMAT = 'yyyy-MM-dd';

export const readParams = (search) => {
  const query = new URLSearchParams(search);
  const exclude = (query.get('exclude') || '')
    .split(',')
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));
  return {
    range: query.get('range') || DEFAULT_PARAMS.range,
    from: query.get('from') || '',
    to: query.get('to') || '',
    bucket: query.get('bucket') || DEFAULT_PARAMS.bucket,
    exclude,
  };
};

export const writeParams = (params) => {
  const query = new URLSearchParams();
  if (params.range !== DEFAULT_PARAMS.range) query.set('range', params.range);
  if (params.range === 'custom') {
    query.set('from', params.from);
    query.set('to', params.to);
  }
  if (params.bucket !== DEFAULT_PARAMS.bucket) query.set('bucket', params.bucket);
  if (params.exclude.length) query.set('exclude', params.exclude.join(','));
  const search = query.toString();
  return search ? `?${search}` : '';
};

// resolveRange converts the selected preset or custom dates into
// a [start, end) range in the browser timezone. Custom end dates
// are inclusive, so the range ends at the start of the next day.
export const resolveRange = ({ range, from, to }, now = new Date()) => {
  const tomorrow = startOfDay(addDays(now, 1));
  switch (range) {
    case 'today':
      return { start: startOfDay(now), end: tomorrow };
    case 'week': {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      return { start, end: addDays(start, 7) };
    }
    case 'month': {
      const start = startOfMonth(now);
      return { start, end: addMonths(start, 1) };
    }
    case '7d':
      return { start: subDays(tomorrow, 7), end: tomorrow };
    case '90d':
      return { start: subDays(tomorrow, 90), end: tomorrow };
    case 'custom': {
      const start = parseISO(from);
      const end = parseISO(to);
      if (!isValid(start) || !isValid(end)) {
        return { error: 'Select a start and end date.' };
      }
      if (end < start) {
        return { error: 'The end date must be after the start date.' };
      }
      if (differenceInCalendarDays(end, start) >= MAX_RANGE_DAYS) {
        return { error: `The date range cannot exceed ${MAX_RANGE_DAYS} days.` };
      }
      return { start: startOfDay(start), end: addDays(startOfDay(end), 1) };
    }
    default:
      return { start: subDays(tomorrow, 30), end: tomorrow };
  }
};

export const buildQuery = (range, params) => {
  const query = new URLSearchParams({
    from: getUnixTime(range.start),
    to: getUnixTime(range.end),
    tz: TIMEZONE,
  });
  if (params.bucket !== 'auto') query.set('bucket', params.bucket);
  if (params.exclude.length) query.set('exclude_repos', params.exclude.join(','));
  return query.toString();
};

export const toDateInput = (date) => format(date, DATE_INPUT_FORMAT);

export const formatRange = (range) => {
  const last = addDays(range.end, -1);
  const start = format(range.start, 'dd/MM/yyyy');
  const end = format(last, 'dd/MM/yyyy');
  return start === end ? start : `${start} – ${end}`;
};

const BUCKET_LABEL_FORMATS = {
  hour: 'HH:mm',
  day: 'dd/MM',
  week: 'dd/MM',
  month: 'MMM yy',
};

const BUCKET_TITLE_FORMATS = {
  hour: 'EEE dd/MM/yyyy HH:mm',
  day: 'EEE dd/MM/yyyy',
  week: "'Week of' dd/MM/yyyy",
  month: 'MMMM yyyy',
};

export const formatBucketLabel = (start, bucket) => format(new Date(start * 1000), BUCKET_LABEL_FORMATS[bucket] || 'dd/MM');

export const formatBucketTitle = (start, bucket) => format(new Date(start * 1000), BUCKET_TITLE_FORMATS[bucket] || 'dd/MM/yyyy');

const pad = (value) => String(value).padStart(2, '0');

export const formatDuration = (secs) => {
  if (!secs) return '0s';
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  if (hours) return `${hours}h ${pad(minutes)}m`;
  if (minutes) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
};

export const formatHours = (secs) => {
  const hours = secs / 3600;
  // no thousands separator: in pt-BR "3.164h" reads as three hours.
  return `${hours >= 100 ? Math.round(hours) : hours.toFixed(1)}h`;
};

export const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

export const formatNumber = (value) => (value ?? 0).toLocaleString();

export const formatEvent = (event) => (event ? event.replace(/_/g, ' ') : 'unknown');

export const failures = (row) => row.failure + row.error + row.killed;
