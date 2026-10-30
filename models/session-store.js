/**
 * models/session-store.js
 * استور نشست روی پایگاه داده SQLite (پیاده‌سازی رابط express-session Store)
 * تا نشست‌ها بعد از ری‌استارت سرور پابماند — بدون هیچ وابستگی بومی.
 */
const { Store } = require('express-session');
const { db, run, get, all } = require('./db');

db.exec(`CREATE TABLE IF NOT EXISTS sessions(
  sid TEXT PRIMARY KEY,
  expiry INTEGER NOT NULL,
  data TEXT NOT NULL
)`);

class SQLiteSessionStore extends Store {
  constructor(options = {}) {
    super();
    this.ttl = options.ttl || 7 * 24 * 60 * 60 * 1000; // یک هفته
  }

  get(sid, cb) {
    try {
      const row = get('SELECT data, expiry FROM sessions WHERE sid = ?', sid);
      if (!row || row.expiry < Date.now()) {
        if (row) run('DELETE FROM sessions WHERE sid = ?', sid);
        return cb(null, null);
      }
      cb(null, JSON.parse(row.data));
    } catch (err) { cb(err); }
  }

  set(sid, sess, cb) {
    try {
      const expiry = Date.now() + (sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : this.ttl);
      run('INSERT INTO sessions(sid, expiry, data) VALUES(?, ?, ?) ' +
          'ON CONFLICT(sid) DO UPDATE SET expiry = excluded.expiry, data = excluded.data',
          sid, expiry, JSON.stringify(sess));
      cb && cb(null);
    } catch (err) { cb && cb(err); }
  }

  destroy(sid, cb) {
    try { run('DELETE FROM sessions WHERE sid = ?', sid); cb && cb(null); }
    catch (err) { cb && cb(err); }
  }

  length(cb) {
    try { cb(null, all('SELECT sid FROM sessions WHERE expiry > ?', Date.now()).length); }
    catch (err) { cb(err); }
  }

  clear(cb) {
    try { run('DELETE FROM sessions'); cb && cb(null); }
    catch (err) { cb && cb(err); }
  }

  /** پاک‌سازی نشست‌های منقضی‌شده */
  prune() {
    try { run('DELETE FROM sessions WHERE expiry < ?', Date.now()); } catch (e) { /* ignore */ }
  }
}

module.exports = SQLiteSessionStore;
