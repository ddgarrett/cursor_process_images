/**
 * Simple event listener: register callbacks by event name, notify with (event, values).
 */
export class EventListener {
  constructor() {
    this._events = {};
  }

  add(event, callback) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
  }

  remove(event, callback) {
    if (this._events[event]) {
      const i = this._events[event].indexOf(callback);
      if (i !== -1) this._events[event].splice(i, 1);
    }
  }

  notify(event, values) {
    if (!this._events[event]) return;
    for (const cb of this._events[event]) cb(event, values);
  }
}
