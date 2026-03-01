/**
 * Application-wide config and constants. ES module.
 */
export const VERSION = '0.2.0';
export const WINDOW_CONFIG = '__WINDOW CONFIG__';
export const BLOG_URI = 'https://www.garrettblog.com';
export const IMG_FILE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif'];
export const VIDEO_FILE_TYPES = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
export const MEDIA_FILE_TYPES = [...IMG_FILE_TYPES, ...VIDEO_FILE_TYPES];

export const EVT_FILE_OPEN = '-FILE_OPEN-';
export const EVT_FILE_NEW = '-FILE_NEW-';
export const EVT_FILE_SAVE = '-FILE_SAVE-';
export const EVT_ADD_FOLDERS = '-ADD_FOLDERS-';
export const EVT_CLEANUP_DIR = '-REORG_IMG-';
export const EVT_FILE_PROPS = '-FILE_PROPS-';
export const EVT_EXIT = '-EXIT-';
export const EVT_ABOUT = '-ABOUT-';
export const EVT_TEST_CODE = '-TEST_CODE-';
export const EVT_SHOW_ALL = '-SHOW_ALL-';
export const EVT_SHOW_TBD = '-SHOW_TBD-';
export const EVT_SHOW_POSSIBLE_DUP = '-SHOW_POSSIBLE_DUP-';
export const EVT_SHOW_POSSIBLE_GOOD_PLUS = '-SHOW_POSSIBLE_GOOD_PLUS-';
export const EVT_SHOW_POSSIBLE_BEST = '-SHOW_POSSIBLE_BEST-';
export const EVT_SHOW_CUSTOM = '-SHOW_CUSTOM-';
export const EVT_NOT_IMPL = '-NOT_IMPLEMENTED-';
export const EVT_TREE = '-TREE-';
export const EVT_IMG_SELECT = '-IMGSEL-';
export const EVT_TABLE_LOAD = '-TABLE_LOAD-';
export const EVT_TABLE_ROW_CHG = '-ROW_CHG-';
export const EVT_WIN_CONFIG = WINDOW_CONFIG;

export const STAT_REJECT = 'reject';
export const STAT_QUAL_BAD = 'bad';
export const STAT_DUP = 'dup';
export const STAT_OK = 'ok';
export const STAT_GOOD = 'good';
export const STAT_BEST = 'best';
export const STAT_TBD = 'tbd';

export const LVL_INITIAL = '0';
export const LVL_QUAL = '1';
export const LVL_DUP = '2';
export const LVL_OK = '3';
export const LVL_GOOD = '4';
export const LVL_BEST = '5';

export const APP_ORG_IMG = 'OI';
export const APP_RVW_IMG = 'RI';
