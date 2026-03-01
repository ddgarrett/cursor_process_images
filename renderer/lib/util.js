/**
 * General utilities: get row by filename, get filename from row, set collection.
 */
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
