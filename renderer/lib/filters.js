/**
 * Table filters: by selection, by status/level.
 */
export class Filter {
  filter(rows) {
    return rows.filter(r => this.test(r));
  }
  test(row) {
    return true;
  }
  get_descr() {
    return 'xxx';
  }
}

/**
 * Rows that match selected tree nodes (folders or files).
 * selected: list of tree node keys. folderKeys: Set of keys that are folders.
 */
export class SelectedTreeNodesFilter extends Filter {
  constructor(selected, folderKeys = new Set()) {
    super();
    this._filter_folders = new Set();
    this._filter_files = new Set();
    for (const name of selected || []) {
      if (!name) {
        this._filter_folders.add(name);
      } else if (folderKeys.has(name)) {
        this._filter_folders.add(name);
      } else {
        const idx = name.lastIndexOf('/');
        const file_loc = idx >= 0 ? name.slice(0, idx) : '';
        const file_name = idx >= 0 ? name.slice(idx + 1) : name;
        this._filter_files.add(JSON.stringify([file_loc, file_name]));
      }
    }
  }

  test(row) {
    const file_loc = row.get('file_location');
    for (const dir of this._filter_folders) {
      if (dir === '' || file_loc === dir || file_loc.startsWith(dir + '/')) return true;
    }
    return this._filter_files.has(JSON.stringify([file_loc, row.get('file_name')]));
  }
}

export class FilterTbd extends Filter {
  test(row) {
    return row.get('img_status') === 'tbd';
  }
  get_descr() {
    return 'To Be Determined (TBD)';
  }
}

export class FilterPossibleDup extends Filter {
  test(row) {
    if (row.get('rvw_lvl') < 3 && row.get('img_status') === 'tbd') return true;
    return row.get('img_status') === 'dup';
  }
  get_descr() {
    return 'possible Duplicate';
  }
}

export class FilterPossibleGoodPlus extends Filter {
  test(row) {
    return Number(row.get('rvw_lvl')) > 3 || row.get('img_status') === 'tbd';
  }
  get_descr() {
    return 'possible Good or Best';
  }
}

export class FilterPossibleBest extends Filter {
  test(row) {
    return Number(row.get('rvw_lvl')) > 4 || row.get('img_status') === 'tbd';
  }
  get_descr() {
    return 'possible Best';
  }
}
