/**
 * Collect stats for a folder from table rows. status/lvl/cnt.
 */
import { Row } from './table.js';

export class FolderStats {
  static headers = ['status', 'lvl', 'cnt'];
  static stat_priority = ['reject', 'bad', 'dup', 'ok', 'good', 'best', 'tbd'];

  static get_headers() {
    return FolderStats.headers;
  }

  constructor() {
    this._cnt = 0;
    this._max_status_idx = -1;
    this._min_lvl = -1;
  }

  add_stats(row) {
    this._cnt += 1;
    const row_lvl = row.get_int('rvw_lvl');
    const status = row.get('img_status');
    const status_idx = FolderStats.stat_priority.indexOf(status);
    if (status_idx === this._max_status_idx) {
      if (status === 'tbd') {
        if (row_lvl < this._min_lvl) this._min_lvl = row_lvl;
      } else {
        if (row_lvl > this._min_lvl) this._min_lvl = row_lvl;
      }
    } else if (status_idx > this._max_status_idx) {
      this._max_status_idx = status_idx;
      this._min_lvl = row_lvl;
    }
  }

  get_stats() {
    if (this._max_status_idx === -1) return [];
    const status = FolderStats.stat_priority[this._max_status_idx];
    return [status, this._min_lvl, this._cnt];
  }
}
