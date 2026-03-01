# NOTE: 

Initially this was run from within the process_images repo and saved in the **electron** subfolder. 
The results were then moved to a new folder and that was used to create this repo.

# Process Images (Electron)

Electron port of the Process Images app. Review and organize image collections with a folder tree, gallery grid, and single-image view.

## Run

```bash
cd electron
npm install
npm start
```

## Features

- **File → Open**: Open an existing `image_collection.csv` from a folder.
- **File → New**: Pick a folder; load images with EXIF and create a new collection.
- **File → Save**: Save the current collection CSV.
- **File → Add Folders**: Scan the same root folder for new images and merge into the collection.
- **Show**: Filter by All, TBD, Possible Duplicate, Possible Good or Best, Possible Best.
- **Tree**: Click folders/files to show them in the Gallery tab.
- **Gallery**: Grid of thumbnails; click to select; right-click to set status (Reject, Poor Quality, Duplicate, Okay, Good, Best).
- **Image**: Single image view for the selected item.

## Structure

- `main.js` – Electron main process (window, IPC, file protocol for `collection://` images).
- `preload.js` – Exposes `window.electronAPI` to the renderer.
- `exifLoader.js` – Node EXIF loader (walks directory, returns row data).
- `renderer/` – UI (HTML/CSS/JS).
- `renderer/lib/` – Shared logic: table, CSV, image collection, filters, tree data, config.

## Not ported

- Reorg Images, Cleanup Dir, Map, Export, Generate Blog, Properties (stubbed or omitted).
