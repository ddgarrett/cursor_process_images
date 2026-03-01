/**
 * Image collection metadata: column definitions for CSV. Matches image_collection_metadata.csv.
 */
import { CsvTable } from './csv_table.js';
import { Row, Column } from './table.js';

const META_COLUMNS = [
  'col_name', 'col_type', 'default', 'load_func', 'exif_tags', 'notes'
];

function metaRow(data) {
  const cols = {};
  META_COLUMNS.forEach((name, i) => { cols[name] = new Column(i, name); });
  return new Row(null, cols, data);
}

const META_ROWS = [
  ['file_id', 'int', '0', 'get_key', 'sys.next_id', 'system generated'],
  ['file_location', 'str', 'na', 'get_key', 'sys.subdir', ''],
  ['file_name', 'str', 'na', 'get_key', 'sys.file_name', ''],
  ['file_size', 'int', '0', 'get_key', 'sys.file_size', ''],
  ['img_lat', 'float', '0', 'get_lat_lon', '["GPS GPSLatitude","GPS GPSLatitudeRef"]', ''],
  ['img_lon', 'float', '0', 'get_lat_lon', '["GPS GPSLongitude","GPS GPSLongitudeRef"]', ''],
  ['img_width', 'int', '0', 'get_key', '["Image ImageWidth","EXIF ExifImageWidth"]', ''],
  ['img_len', 'int', '0', 'get_key', '["Image ImageLength","EXIF ExifImageLength"]', ''],
  ['img_date_time', 'str', '1969:12:31 16:00:00', 'get_key', '["EXIF DateTimeOriginal","Image DateTime","GPS GPSDate"]', ''],
  ['img_exif_ver', 'int', '0', 'get_key', 'EXIF ExifVersion', ''],
  ['img_make', 'str', 'na', 'get_key', 'Image Make', ''],
  ['img_model', 'str', 'na', 'get_key', 'Image Model', ''],
  ['img_rotate', 'any', '0', 'get_key_value', 'Image Orientation', ''],
  ['img_tags', 'str', ' ', '', '', ''],
  ['img_status', 'str', 'tbd', '', '', 'review status'],
  ['rvw_lvl', 'int', '0', '', '', 'review level'],
  ['notes', 'str', '', '', '', ''],
];

const cols = {};
META_COLUMNS.forEach((name, i) => { cols[name] = new Column(i, name); });
const rows = META_ROWS.map(d => metaRow(d));

export const metadata = {
  _cols: cols,
  _rows: rows,
  rows() { return this._rows; },
  *[Symbol.iterator]() { yield* this._rows; }
};

export const IMAGE_COLLECTION_COLUMNS = META_ROWS.map(r => r[0]);
