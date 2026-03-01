/**
 * CSV table: parse from string (text from electronAPI.readFile). ES module.
 */
import { Table, Row, Column } from './table.js';

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

export class CsvTable extends Table {
  static defaultMetadata(colNames) {
    const colDict = {};
    colNames.forEach((name, i) => { colDict[name] = new Column(i, name); });
    return colDict;
  }

  static buildColumnDict(metadata) {
    const colDict = {};
    const metaRows = Array.isArray(metadata) ? metadata : metadata.rows();
    metaRows.forEach((md, i) => {
      const name = md.get ? md.get('col_name') : md.col_name;
      colDict[name] = new Column(i, name);
    });
    return colDict;
  }

  static fromString(text, metadata = null) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    const t = new CsvTable();
    t.fn = '';
    if (lines.length === 0) {
      t._cols = metadata ? CsvTable.buildColumnDict(metadata) : {};
      t._rows = [];
      t._original_rows = [];
      return t;
    }
    const columns = parseCSVLine(lines[0]).map(s => s.replace(/^"|"$/g, ''));
    let colDict;
    let extendValues = [];
    if (metadata == null) {
      colDict = CsvTable.defaultMetadata(columns);
    } else {
      colDict = CsvTable.buildColumnDict(metadata);
      const metaRows = Array.isArray(metadata) ? metadata : metadata.rows();
      for (let i = columns.length; i < metaRows.length; i++) {
        const md = metaRows[i];
        extendValues.push(md.get ? md.get('default') : md.default);
      }
    }
    const rows = [];
    for (let r = 1; r < lines.length; r++) {
      const values = parseCSVLine(lines[r]);
      const full = extendValues.length ? [...values, ...extendValues] : values;
      rows.push(new Row(null, colDict, full));
    }
    t._cols = colDict;
    t._rows = rows;
    t._original_rows = rows;
    return t;
  }

  constructor() {
    super({}, []);
    this.fn = '';
  }

  save_as(fn, writeFileAsync) {
    const header = Object.keys(this._cols).join(',');
    const body = this._original_rows.map(row => row._data.map(c => {
      const s = String(c);
      return s.includes(',') || s.includes('"') ? `"${String(s).replace(/"/g, '""')}"` : s;
    }).join(','));
    const content = [header, ...body].join('\n');
    if (writeFileAsync) return writeFileAsync(fn, content, 'utf8');
    this.fn = fn;
  }
}
