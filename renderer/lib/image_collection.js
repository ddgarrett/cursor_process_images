/**
 * Image collection table: CSV with image_collection columns and ImgColRow.
 */
import { CsvTable } from './csv_table.js';
import { Row, Column } from './table.js';
import { metadata } from './metadata.js';

const TBD_LVL_TRANSLATE = ['Reject?', 'Bad?', 'Dup?', 'Good?', 'Best?', '???'];

export function translate_status_lvl(status, level) {
  if (status === 'tbd') {
    level = TBD_LVL_TRANSLATE[parseInt(level, 10)] || '???';
  } else {
    level = '';
  }
  return [status, level];
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += c;
  }
  result.push(current.trim());
  return result;
}

export class ImageCollection extends CsvTable {
  static translate_status_lvl(status, level) {
    return translate_status_lvl(status, level);
  }

  static fromString(text) {
    const t = new ImageCollection('');
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (lines.length === 0) {
      t._cols = CsvTable.buildColumnDict(metadata);
      t._rows = [];
      t._original_rows = [];
      return t;
    }
    const columns = parseCSVLine(lines[0]).map(s => s.replace(/^"|"$/g, ''));
    const colDict = CsvTable.buildColumnDict(metadata);
    const rows = [];
    for (let r = 1; r < lines.length; r++) {
      const values = parseCSVLine(lines[r]);
      rows.push(new ImgColRow(t, colDict, values));
    }
    t._cols = colDict;
    t._rows = rows;
    t._original_rows = rows;
    return t;
  }

  constructor(fn = '') {
    super();
    this.fn = fn;
  }

  /** Build collection from array of row objects (e.g. from EXIF load). */
  static fromRows(rows, metadataRef = metadata) {
    const t = new ImageCollection('');
    const colDict = CsvTable.buildColumnDict(metadataRef);
    const colNames = metadataRef._rows.map(r => r.get('col_name'));
    const rowObjs = (rows || []).map(obj => {
      const data = colNames.map(name => obj[name] != null ? String(obj[name]) : '');
      return new ImgColRow(t, colDict, data);
    });
    t._cols = colDict;
    t._rows = rowObjs;
    t._original_rows = rowObjs;
    return t;
  }

  _create_row(cols, data) {
    return new ImgColRow(this, cols, data);
  }

  resort() {
    this._rows = [...this._rows].sort((a, b) => {
      const loc = (a.get('file_location') || '').localeCompare(b.get('file_location') || '');
      if (loc !== 0) return loc;
      return (a.get('img_date_time') || '').localeCompare(b.get('img_date_time') || '');
    });
    this._original_rows = this._rows;
  }

  renumber() {
    let file_id = 1000;
    for (const row of this._rows) {
      row.set('file_id', file_id);
      file_id += 1;
    }
  }
}

export class ImgColRow extends Row {
  get(colName) {
    if (colName === '_imgcol_status_lvl') return this.get_status_lvl();
    if (colName === '_imgcol_tooltip') return this.get_tooltip();
    return super.get(colName);
  }

  get_status_lvl() {
    const status = this.get('img_status');
    const lvl = this.get('rvw_lvl');
    return ImageCollection.translate_status_lvl(status, lvl);
  }

  get_tooltip() {
    const [status, lvl] = this.get_status_lvl();
    const name = this.get('file_name');
    return `${status} ${lvl}\n${name}`;
  }
}
