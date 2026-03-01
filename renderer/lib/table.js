/**
 * Tabular data with rows and columns. Browser-safe ES module.
 */
export class Column {
  constructor(colIdx, colName) {
    this._colIdx = colIdx;
    this._colName = colName;
  }

  _get(data) {
    return data[this._colIdx];
  }

  _set(data, value, asStr = true) {
    data[this._colIdx] = asStr ? String(value) : value;
  }

  _compare(data, value) {
    const thisVal = this._get(data);
    if (thisVal < value) return -1;
    if (thisVal > value) return 1;
    return 0;
  }

  _defaultValue() {
    return '';
  }
}

export class Row {
  constructor(table, cols, data = null) {
    this._table = table;
    this._cols = cols;
    this._data = data === null
      ? Object.values(cols).map(c => c._defaultValue())
      : [...data];
  }

  get(colName) {
    const col = this._cols[colName];
    return col ? col._get(this._data) : undefined;
  }

  set(colName, value, asStr = true) {
    const col = this._cols[colName];
    if (col) col._set(this._data, value, asStr);
  }

  get_int(colName) {
    const v = this.get(colName);
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  }
}

export class Table {
  constructor(cols = {}, rows = []) {
    this._cols = cols;
    this._rows = rows;
    this._original_rows = rows;
    this._filter = null;
  }

  *[Symbol.iterator]() {
    yield* this._rows;
  }

  rows() {
    return this._rows;
  }

  filter_rows(filter = null) {
    this._filter = filter;
    this._rows = filter ? filter.filter(this._original_rows) : [...this._original_rows];
  }

  refilter() {
    this.filter_rows(this._filter);
  }

  new_row() {
    const row = this._create_row(this._cols, null);
    this._rows.push(row);
    this._original_rows.push(row);
    return row;
  }

  _create_row(cols, data) {
    return new Row(this, cols, data);
  }
}
