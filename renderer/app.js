/**
 * Process Images - Renderer: UI and event wiring.
 */
import * as config from './lib/config.js';
import { EventListener } from './lib/eventListener.js';
import { ImageCollection } from './lib/image_collection.js';
import { buildTreeData } from './lib/treedata.js';
import {
  SelectedTreeNodesFilter,
  FilterTbd,
  FilterPossibleDup,
  FilterPossibleGoodPlus,
  FilterPossibleBest,
} from './lib/filters.js';
import { get_fn_for_row, get_row_for_fn, isVideoRow } from './lib/util.js';

const api = window.electronAPI;
if (!api) throw new Error('electronAPI not available');

let table = null;
let directory = '';
let treeData = { roots: [], rowsByKey: new Map(), folderKeys: new Set() };
let selectedTreeKeys = [];
const expandedTreeKeys = new Set();
const listeners = new EventListener();
let itemsPerPage = 9;
let galleryPage = 0;
let galleryRows = [];
let selectedRows = [];
let lastImageFn = null;
let flatTreeList = [];
let lastSelectedTreeIndex = null;

const statusEl = document.getElementById('status-text');
const treeContainer = document.getElementById('tree-container');
const galleryPagesEl = document.getElementById('gallery-pages');
const galleryPageNbrEl = document.getElementById('gallery-page-nbr');
const mainImageEl = document.getElementById('main-image');
const mainVideoEl = document.getElementById('main-video');
const imageContainerEl = document.getElementById('image-container');

function updateStatus(msg) {
  statusEl.textContent = msg || '';
}

function setCollection(newTable, dir) {
  table = newTable;
  directory = dir || '';
  api.setCollectionRoot(directory);
  expandedTreeKeys.clear();
  rebuildTree();
  listeners.notify(config.EVT_TABLE_LOAD, {});
}

function rebuildTree() {
  if (!table || !table.rows().length) {
    treeData = { roots: [], rowsByKey: new Map(), folderKeys: new Set() };
    selectedTreeKeys = [];
    renderTree();
    renderGallery();
    return;
  }
  treeData = buildTreeData(table.rows());
  if (expandedTreeKeys.size === 0 && treeData.roots.length) {
    treeData.roots.forEach(r => expandedTreeKeys.add(r.key));
  }
  renderTree();
  const values = { [config.EVT_TREE]: selectedTreeKeys };
  listeners.notify(config.EVT_TREE, values);
}

function renderTree() {
  treeContainer.innerHTML = '';
  flatTreeList = [];
  if (!treeData.roots || !treeData.roots.length) {
    treeContainer.textContent = 'No collection loaded. Use File → Open or New.';
    return;
  }
  function renderNode(node, depth = 0) {
    const div = document.createElement('div');
    div.className = 'tree-node';
    const hasChildren = node.children && node.children.length > 0;
    const isFolder = node.isFolder === true;
    const isExpanded = isFolder && expandedTreeKeys.has(node.key);
    const isSelected = selectedTreeKeys.includes(node.key);
    const isVideo = !isFolder && node.row && isVideoRow(node.row);

    const label = document.createElement('div');
    label.className = 'tree-label' + (isSelected ? ' selected' : '');
    if (isFolder) label.classList.add('tree-folder');
    if (isFolder && isExpanded) label.classList.add('expanded');
    if (!isFolder) {
      label.classList.add('tree-file');
      if (isVideo) label.classList.add('video-file');
    }
    label.dataset.key = node.key;
    const idx = flatTreeList.length;
    flatTreeList.push({ key: node.key, label });
    label.dataset.index = String(idx);
    label.style.paddingLeft = `${depth * 12 + 4}px`;

    const expandCell = document.createElement('span');
    expandCell.className = 'tree-expand';
    if (isFolder && hasChildren) {
      expandCell.textContent = isExpanded ? '▼' : '▶';
      expandCell.setAttribute('aria-expanded', isExpanded);
      expandCell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (expandedTreeKeys.has(node.key)) expandedTreeKeys.delete(node.key);
        else expandedTreeKeys.add(node.key);
        renderTree();
      });
    } else {
      expandCell.textContent = ' ';
      expandCell.classList.add('tree-expand-placeholder');
    }
    label.appendChild(expandCell);

    const textSpan = document.createElement('span');
    textSpan.className = 'tree-text';
    textSpan.textContent = node.text;
    label.appendChild(textSpan);

    if (node.values && node.values.length) {
      const stat = document.createElement('span');
      stat.className = 'tree-stat';
      stat.textContent = node.values.slice(-1)[0] || '';
      label.appendChild(stat);
    }
    label.addEventListener('click', (e) => {
      if (e.target.classList.contains('tree-expand')) return;
      e.stopPropagation();
      const index = parseInt(label.dataset.index, 10);
      const hasToggle = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (isShift && lastSelectedTreeIndex !== null) {
        const start = Math.min(lastSelectedTreeIndex, index);
        const end = Math.max(lastSelectedTreeIndex, index);
        if (!hasToggle) selectedTreeKeys = [];
        for (let i = start; i <= end; i++) {
          const item = flatTreeList[i];
          if (!item) continue;
          if (hasToggle && selectedTreeKeys.includes(item.key)) {
            selectedTreeKeys = selectedTreeKeys.filter(k => k !== item.key);
          } else if (!selectedTreeKeys.includes(item.key)) {
            selectedTreeKeys.push(item.key);
          }
        }
        lastSelectedTreeIndex = index;
        rebuildTree();
        return;
      }

      if (!hasToggle) {
        selectedTreeKeys = [node.key];
      } else {
        const i = selectedTreeKeys.indexOf(node.key);
        if (i >= 0) selectedTreeKeys.splice(i, 1);
        else selectedTreeKeys.push(node.key);
      }
      lastSelectedTreeIndex = index;
      rebuildTree();
    });
    div.appendChild(label);

    if (hasChildren && isFolder && isExpanded) {
      const childrenDiv = document.createElement('div');
      childrenDiv.className = 'tree-children';
      node.children.forEach(c => childrenDiv.appendChild(renderNode(c, depth + 1)));
      div.appendChild(childrenDiv);
    }
    return div;
  }
  treeData.roots.forEach(r => treeContainer.appendChild(renderNode(r)));
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function getGridSize(n) {
  const s = Math.ceil(Math.sqrt(n)) || 1;
  return { cols: s, rows: Math.ceil(n / s) || 1 };
}

function renderGallery() {
  galleryPagesEl.innerHTML = '';
  const filter = new SelectedTreeNodesFilter(selectedTreeKeys, treeData.folderKeys);
  galleryRows = table ? filter.filter(table.rows()) : [];
  const perPage = Math.max(1, itemsPerPage);
  const { cols, rows } = getGridSize(perPage);
  galleryPagesEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  galleryPagesEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  const totalPages = Math.max(1, Math.ceil(galleryRows.length / perPage));
  galleryPage = Math.min(galleryPage, totalPages - 1);
  if (galleryPage < 0) galleryPage = 0;
  const start = galleryPage * perPage;
  const pageRows = galleryRows.slice(start, start + perPage);
  galleryPageNbrEl.textContent = `Page ${galleryPage + 1} of ${totalPages}`;
  for (let i = 0; i < perPage; i++) {
    const cell = document.createElement('div');
    cell.className = 'gallery-cell';
    const row = pageRows[i];
    if (row) {
      const fn = get_fn_for_row(row);
      const src = directory ? `collection:///${fn.replace(/^\//, '')}` : '';
      const video = isVideoRow(row);
      if (video) {
        const videoEl = document.createElement('video');
        videoEl.src = src + '#t=0.1';
        videoEl.preload = 'metadata';
        videoEl.muted = true;
        cell.appendChild(videoEl);
        const playIcon = document.createElement('div');
        playIcon.className = 'play-icon';
        playIcon.innerHTML = '▶';
        cell.appendChild(playIcon);
      } else {
        const img = document.createElement('img');
        img.src = src;
        img.alt = row.get('file_name');
        img.title = row.get('_imgcol_tooltip') || '';
        cell.appendChild(img);
      }
      const isSelected = selectedRows.some(r => r.get('file_id') === row.get('file_id'));
      if (isSelected) cell.classList.add('selected');
      cell.addEventListener('click', () => {
        const idx = selectedRows.findIndex(r => r.get('file_id') === row.get('file_id'));
        if (idx >= 0) selectedRows.splice(idx, 1);
        else selectedRows.push(row);
        renderGallery();
        if (selectedRows.length) {
          const fn = get_fn_for_row(selectedRows[selectedRows.length - 1]);
          listeners.notify(config.EVT_IMG_SELECT, { [config.EVT_IMG_SELECT]: [fn] });
        }
      });
      cell.addEventListener('dblclick', () => {
        api.openViewer(src, video);
      });
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showStatusContextMenu(e, row);
      });
    }
    galleryPagesEl.appendChild(cell);
  }
}

function showStatusContextMenu(e, row) {
  const menu = [
    { label: 'Reject', status: 'reject', level: '0' },
    { label: 'Poor Quality', status: 'bad', level: '1' },
    { label: 'Duplicate', status: 'dup', level: '2' },
    { label: 'Just Okay', status: 'ok', level: '3' },
    { label: 'Good', status: 'good', level: '4' },
    { label: 'Best', status: 'best', level: '5' },
  ];
  const popup = document.createElement('div');
  popup.className = 'context-menu';
  popup.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;background:#2d2d2d;border:1px solid #444;border-radius:4px;padding:4px;z-index:1000;min-width:160px;`;
  menu.forEach(({ label, status, level }) => {
    const item = document.createElement('div');
    item.textContent = label;
    item.style.cssText = 'padding:6px 12px;cursor:pointer;';
    item.addEventListener('click', () => {
      row.set('img_status', status);
      row.set('rvw_lvl', level);
      document.body.removeChild(popup);
      listeners.notify(config.EVT_TABLE_ROW_CHG, { [config.EVT_TABLE_ROW_CHG]: [row] });
      renderTree();
      renderGallery();
    });
    item.addEventListener('mouseenter', () => { item.style.background = '#404040'; });
    item.addEventListener('mouseleave', () => { item.style.background = ''; });
    popup.appendChild(item);
  });
  document.body.appendChild(popup);
  const close = () => { if (popup.parentNode) document.body.removeChild(popup); };
  setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
}

function renderImageTab(fn) {
  if (!fn) {
    mainImageEl.src = '';
    mainImageEl.alt = '';
    mainVideoEl.src = '';
    imageContainerEl.classList.remove('has-video');
    mainImageEl.style.display = '';
    mainVideoEl.style.display = 'none';
    return;
  }
  lastImageFn = fn;
  const src = directory ? `collection:///${fn.replace(/^\//, '')}` : '';
  const row = table ? get_row_for_fn(table, fn) : null;
  const video = row && isVideoRow(row);
  imageContainerEl.classList.toggle('has-video', video);
  if (video) {
    mainImageEl.style.display = 'none';
    mainVideoEl.style.display = 'block';
    mainVideoEl.src = src;
    mainVideoEl.alt = row ? row.get('file_name') : '';
  } else {
    mainImageEl.style.display = 'block';
    mainVideoEl.style.display = 'none';
    mainVideoEl.src = '';
    mainImageEl.src = src;
    mainImageEl.alt = row ? row.get('file_name') : '';
  }
  if (row) {
    const title = row.get('_imgcol_tooltip') || '';
    mainImageEl.title = title;
    mainVideoEl.title = title;
    const [status, lvl] = row.get_status_lvl();
    updateStatus(`${fn} - ${status} ${lvl}`);
  }
}

listeners.add(config.EVT_TREE, (event, values) => {
  selectedRows = [];
  renderGallery();
});

listeners.add(config.EVT_IMG_SELECT, (event, values) => {
  const list = values[config.EVT_IMG_SELECT];
  const fn = list && list.length ? list[list.length - 1] : null;
  renderImageTab(fn);
});

imageContainerEl.addEventListener('dblclick', () => {
  if (!lastImageFn || !directory) return;
  const src = `collection:///${lastImageFn.replace(/^\//, '')}`;
  const row = table ? get_row_for_fn(table, lastImageFn) : null;
  api.openViewer(src, row && isVideoRow(row));
});

listeners.add(config.EVT_TABLE_LOAD, () => {
  rebuildTree();
});

listeners.add(config.EVT_TABLE_ROW_CHG, () => {
  renderTree();
  renderGallery();
});

document.querySelectorAll('[data-action]').forEach(el => {
  el.addEventListener('click', async () => {
    const action = el.dataset.action;
    if (action === config.EVT_FILE_OPEN) {
      const path = await api.openFile([{ name: 'Image Collection', extensions: ['csv'] }]);
      if (!path) { updateStatus('Open canceled'); return; }
      const text = await api.readFile(path, 'utf8');
      const dir = await api.pathDirname(path);
      const tbl = ImageCollection.fromString(text);
      tbl.fn = path;
      setCollection(tbl, dir);
      updateStatus(`Collection with ${table.rows().length} images loaded from ${dir}`);
    } else if (action === config.EVT_FILE_NEW) {
      const dir = await api.openFolder();
      if (!dir) { updateStatus('New canceled'); return; }
      const collectionPath = await api.pathJoin(dir, 'image_collection.csv');
      try {
        await api.readFile(collectionPath);
        updateStatus('Collection file already exists in that folder. Delete it first.');
        return;
      } catch (_) {}
      updateStatus('Loading images...');
      const rows = await api.loadExifDirectory(dir);
      const tbl = ImageCollection.fromRows(rows);
      tbl.fn = collectionPath;
      tbl.resort();
      tbl.renumber();
      setCollection(tbl, dir);
      updateStatus(`${table.rows().length} images loaded from ${dir}`);
    } else if (action === config.EVT_FILE_SAVE) {
      if (!table || !table.fn) { updateStatus('No collection loaded'); return; }
      const header = Object.keys(table._cols).join(',');
      const body = table._original_rows.map(row =>
        row._data.map(c => {
          const s = String(c);
          return s.includes(',') || s.includes('"') ? `"${String(s).replace(/"/g, '""')}"` : s;
        }).join(',')
      ).join('\n');
      await api.writeFile(table.fn, header + '\n' + body, 'utf8');
      updateStatus(`Collection saved to ${table.fn}`);
    } else if (action === config.EVT_ADD_FOLDERS) {
      if (!directory) { updateStatus('Open a collection first'); return; }
      updateStatus('Loading new folders...');
      const rows = await api.loadExifDirectory(directory);
      const existingSet = new Set(table.rows().map(r => `${r.get('file_location')}/${r.get('file_name')}`));
      const newRows = ImageCollection.fromRows(rows);
      let added = 0;
      newRows.rows().forEach(r => {
        const key = `${r.get('file_location')}/${r.get('file_name')}`;
        if (!existingSet.has(key)) {
          existingSet.add(key);
          table._rows.push(r);
          table._original_rows.push(r);
          added++;
        }
      });
      table.resort();
      table.renumber();
      listeners.notify(config.EVT_TABLE_LOAD, {});
      updateStatus(`${added} images added`);
    } else if (action === config.EVT_EXIT) {
      window.close();
    } else if (action === config.EVT_ABOUT) {
      alert(`Process Images\nVersion ${config.VERSION}\nElectron`);
    } else if (action === config.EVT_SHOW_ALL) {
      if (table) table.filter_rows(null);
      listeners.notify(config.EVT_TABLE_LOAD, {});
      updateStatus('Showing All Images');
    } else if (action === config.EVT_SHOW_TBD) {
      if (table) table.filter_rows(new FilterTbd());
      listeners.notify(config.EVT_TABLE_LOAD, {});
      updateStatus('Filtered: TBD');
    } else if (action === config.EVT_SHOW_POSSIBLE_DUP) {
      if (table) table.filter_rows(new FilterPossibleDup());
      listeners.notify(config.EVT_TABLE_LOAD, {});
      updateStatus('Filtered: Possible Duplicate');
    } else if (action === config.EVT_SHOW_POSSIBLE_GOOD_PLUS) {
      if (table) table.filter_rows(new FilterPossibleGoodPlus());
      listeners.notify(config.EVT_TABLE_LOAD, {});
      updateStatus('Filtered: Possible Good or Best');
    } else if (action === config.EVT_SHOW_POSSIBLE_BEST) {
      if (table) table.filter_rows(new FilterPossibleBest());
      listeners.notify(config.EVT_TABLE_LOAD, {});
      updateStatus('Filtered: Possible Best');
    } else if (action === config.EVT_FILE_PROPS || action === config.EVT_CLEANUP_DIR) {
      updateStatus('Not implemented in this build');
    }
  });
});

document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(btn.dataset.tab + '-tab');
    if (panel) panel.classList.add('active');
  });
});

document.getElementById('gallery-pgup').addEventListener('click', () => {
  if (galleryPage > 0) { galleryPage--; renderGallery(); }
});
document.getElementById('gallery-pgdn').addEventListener('click', () => {
  const perPage = Math.max(1, itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(galleryRows.length / perPage));
  if (galleryPage < totalPages - 1) { galleryPage++; renderGallery(); }
});
document.getElementById('gallery-home').addEventListener('click', () => {
  galleryPage = 0;
  renderGallery();
});
document.getElementById('gallery-end').addEventListener('click', () => {
  const perPage = Math.max(1, itemsPerPage);
  galleryPage = Math.max(0, Math.ceil(galleryRows.length / perPage) - 1);
  renderGallery();
});

document.getElementById('page-size').addEventListener('change', (e) => {
  const val = parseInt(e.target.value, 10);
  if (!Number.isNaN(val) && val >= 1) {
    itemsPerPage = val;
    galleryPage = 0;
    renderGallery();
  }
});

const resizerEl = document.getElementById('resizer');
const treePaneEl = document.getElementById('tree-pane');
let isResizing = false;
if (resizerEl && treePaneEl) {
  resizerEl.addEventListener('mousedown', () => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    const minW = 150;
    const maxW = Math.max(minW, window.innerWidth * 0.8);
    if (newWidth >= minW && newWidth <= maxW) {
      treePaneEl.style.width = `${newWidth}px`;
    }
  });
  document.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    document.querySelector('[data-action="-FILE_SAVE-"]').click();
  }
});

updateStatus('Ready. File → Open or New to load a collection.');
