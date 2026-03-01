/**
 * EXIF loader for main process: walk directory, read EXIF from images, return row data.
 * Images: ExifReader. Videos: exiftool-vendored (same approach as typescript_view_images).
 */
const fs = require('fs').promises;
const path = require('path');
const ExifReader = require('exifreader');
let exiftool = null;
try {
  const vendored = require('exiftool-vendored');
  exiftool = vendored.exiftool;
} catch (_) {
  // exiftool-vendored optional; video metadata will use placeholders
}

const IMG_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif'];
const VIDEO_EXT = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
const MEDIA_EXT = [...IMG_EXT, ...VIDEO_EXT];

const VIDEO_DATE_KEYS = [
  'DateTimeOriginal',
  'CreateDate',
  'DateTime',
  'ModifyDate',
  'GPSDateStamp',
  'FileCreateDate',
  'FileModifyDate',
];

function getExifValue(tags, keys) {
  if (!tags || typeof tags !== 'object') return undefined;
  for (const key of keys) {
    const v = tags[key];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function parseCoord(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : undefined;
}

/** Convert ExifTool date (Date or string) to our row format YYYY:MM:DD HH:mm:ss */
function videoDateToRowFormat(value) {
  if (value === undefined || value === null) return '1969:12:31 16:00:00';
  let date;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    date = value;
  } else if (typeof value === 'string' && value.trim()) {
    date = new Date(value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
    if (Number.isNaN(date.getTime())) return '1969:12:31 16:00:00';
  } else {
    return '1969:12:31 16:00:00';
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}:${m}:${d} ${h}:${min}:${s}`;
}

async function readVideoMetadata(filePath) {
  if (!exiftool) return null;
  try {
    const tags = await exiftool.read(filePath);
    if (!tags || typeof tags !== 'object') return null;
    const latitude = parseCoord(tags.GPSLatitude);
    const longitude = parseCoord(tags.GPSLongitude);
    const dateRaw = getExifValue(tags, VIDEO_DATE_KEYS);
    const img_date_time = videoDateToRowFormat(dateRaw);
    const img_width = parseInt(tags.ImageWidth ?? tags.VideoWidth ?? 0, 10) || 0;
    const img_len = parseInt(tags.ImageHeight ?? tags.VideoHeight ?? 0, 10) || 0;
    return {
      img_lat: latitude ?? 0,
      img_lon: longitude ?? 0,
      img_date_time,
      img_width,
      img_len,
    };
  } catch (_) {
    return null;
  }
}

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
        if (!MEDIA_EXT.includes(ext) || e.name.startsWith('.')) continue;
        const stat = await fs.stat(full);
        const isVideo = VIDEO_EXT.includes(ext);
        let tags = {};
        let videoMeta = null;
        if (!isVideo) {
          try {
            const buf = await fs.readFile(full);
            tags = ExifReader.load(buf);
          } catch (_) {}
        } else {
          videoMeta = await readVideoMetadata(full);
        }
        const row = {
          file_id: fileId++,
          file_location: subdirNorm,
          file_name: e.name,
          file_size: stat.size,
          file_media_type: isVideo ? 'video' : 'image',
      img_lat: isVideo ? (videoMeta?.img_lat ?? 0) : getLatLon(tags, 'GPSLatitude', 'GPSLatitudeRef'),
      img_lon: isVideo ? (videoMeta?.img_lon ?? 0) : getLatLon(tags, 'GPSLongitude', 'GPSLongitudeRef'),
      img_width: isVideo ? (videoMeta?.img_width ?? 0) : parseInt(getTag(tags, ['ImageWidth', 'ExifImageWidth']), 10) || 0,
      img_len: isVideo ? (videoMeta?.img_len ?? 0) : parseInt(getTag(tags, ['ImageHeight', 'ExifImageLength']), 10) || 0,
      img_date_time: isVideo ? (videoMeta?.img_date_time ?? '1969:12:31 16:00:00') : getTag(tags, ['DateTimeOriginal', 'DateTime', 'GPSDateStamp'], '1969:12:31 16:00:00'),
      img_exif_ver: 0,
      img_make: isVideo ? 'na' : getTag(tags, 'Make', 'na'),
      img_model: isVideo ? 'na' : getTag(tags, 'Model', 'na'),
      img_rotate: isVideo ? 0 : parseInt(getTag(tags, 'Orientation'), 10) || 0,
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
