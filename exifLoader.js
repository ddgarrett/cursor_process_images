/**
 * EXIF loader for main process: walk directory, read EXIF from images, return row data.
 */
const fs = require('fs').promises;
const path = require('path');
const ExifReader = require('exifreader');

const IMG_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif'];

function getTag(tags, keys, defaultVal) {
  if (typeof keys === 'string') keys = [keys];
  for (const k of keys) {
    const t = tags[k];
    if (t && t.description !== undefined) return String(t.description);
    if (t && t.value !== undefined) return String(Array.isArray(t.value) ? t.value[0] : t.value);
  }
  return defaultVal;
}

function getLatLon(tags, latKey, refKey) {
  try {
    const latTag = tags[latKey];
    const refTag = tags[refKey];
    if (!latTag || !refTag) return 0;
    const deg = latTag.description || (latTag.value && (Array.isArray(latTag.value) ? latTag.value[0] : latTag.value));
    const ref = refTag.description || (refTag.value && (Array.isArray(refTag.value) ? refTag.value[0] : refTag.value));
    if (deg == null) return 0;
    const parts = String(deg).replace(/°/g, ' ').split(/\s+/).filter(Boolean);
    let val = 0;
    if (parts.length >= 3) {
      val = parseFloat(parts[0]) + parseFloat(parts[1]) / 60 + parseFloat(parts[2]) / 3600;
    } else {
      val = parseFloat(deg);
    }
    if (ref === 'S' || ref === 'W') val = -val;
    return Math.round(val * 1e6) / 1e6;
  } catch (_) {
    return 0;
  }
}

async function loadDirectory(dirPath) {
  const rows = [];
  let fileId = 1000;
  async function walk(current, relSubdir) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    const subdirNorm = (relSubdir || '').replace(/\\/g, '/') || '/';
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith('_') || e.name.startsWith('.') || e.name.startsWith('$')) continue;
        const nextRel = relSubdir ? `${relSubdir}/${e.name}` : `/${e.name}`;
        await walk(full, nextRel);
      } else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        if (!IMG_EXT.includes(ext) || e.name.startsWith('.')) continue;
        const stat = await fs.stat(full);
        let tags = {};
        try {
          const buf = await fs.readFile(full);
          tags = ExifReader.load(buf);
        } catch (_) {}
        const row = {
          file_id: fileId++,
          file_location: subdirNorm,
          file_name: e.name,
          file_size: stat.size,
      img_lat: getLatLon(tags, 'GPSLatitude', 'GPSLatitudeRef'),
      img_lon: getLatLon(tags, 'GPSLongitude', 'GPSLongitudeRef'),
      img_width: parseInt(getTag(tags, ['ImageWidth', 'ExifImageWidth']), 10) || 0,
      img_len: parseInt(getTag(tags, ['ImageHeight', 'ExifImageLength']), 10) || 0,
      img_date_time: getTag(tags, ['DateTimeOriginal', 'DateTime', 'GPSDateStamp'], '1969:12:31 16:00:00'),
      img_exif_ver: 0,
      img_make: getTag(tags, 'Make', 'na'),
      img_model: getTag(tags, 'Model', 'na'),
      img_rotate: parseInt(getTag(tags, 'Orientation'), 10) || 0,
          img_tags: ' ',
          img_status: 'tbd',
          rvw_lvl: 0,
          notes: '',
        };
        rows.push(row);
      }
    }
  }
  await walk(dirPath, '');
  return rows;
}

module.exports = { loadDirectory };
