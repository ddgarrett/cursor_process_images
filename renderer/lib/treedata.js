/**
 * Tree data from image collection rows: folders with stats, then files.
 */
import { FolderStats } from './folder_stats.js';
import { ImageCollection } from './image_collection.js';

const STATS_KEY = '/stats/';

function addDictFolder(dict, nodes, idx, row) {
  if (idx >= nodes.length) return;
  const key = nodes[idx];
  if (!dict[key]) dict[key] = { [STATS_KEY]: new FolderStats() };
  dict[key][STATS_KEY].add_stats(row);
  addDictFolder(dict[key], nodes, idx + 1, row);
}

/**
 * Build tree structure for UI. Returns { roots: [{ key, text, values, children }], rowsByKey }.
 */
export function buildTreeData(rows) {
  const dict = {};
  for (const row of rows) {
    const imgFolder = (row.get && row.get('file_location')) || row.file_location || '';
    const nodes = imgFolder.split('/').filter(Boolean);
    addDictFolder(dict, nodes, 0, row);
  }

  const roots = [];
  const rowsByKey = new Map();
  const folderKeys = new Set();
  const keyToNode = new Map();

  function insertFolder(key, value, parentKey) {
    const tdKey = parentKey ? `${parentKey}/${key}` : `/${key}`;
    folderKeys.add(tdKey);
    const stats = value[STATS_KEY];
    const [status, lvl, cnt] = stats.get_stats();
    const translated = ImageCollection.translate_status_lvl(status, String(lvl));
    const values = [...translated, String(cnt)];
    const node = { key: tdKey, text: key, values, children: [], isFolder: true };
    rowsByKey.set(tdKey, null);
    keyToNode.set(tdKey, node);
    for (const k of Object.keys(value)) {
      if (k === STATS_KEY) continue;
      const child = insertFolder(k, value[k], tdKey);
      node.children.push(child);
    }
    return node;
  }

  for (const k of Object.keys(dict)) {
    roots.push(insertFolder(k, dict[k], ''));
  }

  // Add file nodes as children of their folder
  for (const row of rows) {
    const parent = (row.get && row.get('file_location')) || row.file_location || '';
    const name = (row.get && row.get('file_name')) || row.file_name || '';
    const key = parent ? `${parent}/${name}` : `/${name}`;
    rowsByKey.set(key, row);
    const folderNode = keyToNode.get(parent);
    if (folderNode) {
      const [status, lvl] = row.get_status_lvl ? row.get_status_lvl() : ['', ''];
      folderNode.children.push({
        key,
        text: name,
        values: [status, lvl],
        children: [],
        isFolder: false,
        row,
      });
    }
  }

  return { roots, rowsByKey, rows, folderKeys };
}
