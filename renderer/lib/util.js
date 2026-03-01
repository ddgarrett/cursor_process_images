import { VIDEO_FILE_TYPES } from './config.js';

/**
 * General utilities: get row by filename, get filename from row, set collection.
 */
export function isVideoRow(row) {
  if (row.get && row.get('file_media_type') === 'video') return true;
  const name = (row.get && row.get('file_name')) || row.file_name || '';
  const ext = name.toLowerCase().slice(name.lastIndexOf('.'));
  return VIDEO_FILE_TYPES.includes(ext);
}

export function get_row_for_fn(table, filename) {
  const norm = filename.replace(/\\/g, '/');
  const lastSlash = norm.lastIndexOf('/');
  const loc = lastSlash >= 0 ? norm.slice(0, lastSlash) : '';
  const name = lastSlash >= 0 ? norm.slice(lastSlash + 1) : norm;
  for (const row of table.rows()) {
    if (row.get('file_name') === name && row.get('file_location') === loc) return row;
  }
  return null;
}

export function get_fn_for_row(row) {
  const loc = (row.get('file_location') || '').replace(/\\/g, '/');
  const name = row.get('file_name') || '';
  return loc ? `${loc}/${name}` : name;
}
