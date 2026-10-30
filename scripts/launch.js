/**
 * scripts/launch.js
 * راه‌انداز یک‌کلیکی: نصب وابستگی‌ها در صورت نیاز، ساخت دیتابیس نمونه،
 * اجرای سرور و باز کردن مرورگر — همه در یک فایل تا از تکرار در لانچرها جلوگیری شود.
 *
 *   node scripts/launch.js             ← اجرای عادی در ترمینال (پنجره باز می‌ماند)
 *   node scripts/launch.js --background ← اجرا در پس‌زمینه (ویژه ترمکس/موبایل)
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(__dirname, '..');
const background = process.argv.includes('--background');
const MIN_NODE = [22, 13, 0];

/* ---------- ۱) بررسی نسخه Node.js ---------- */
function checkNode() {
  const [maj, min] = process.versions.node.split('.').map(Number);
  const ok = maj > MIN_NODE[0] || (maj === MIN_NODE[0] && min >= MIN_NODE[1]);
  if (ok) return;
  console.error('');
  console.error('  ✗ نسخه Node.js شما قدیمی است: v' + process.versions.node);
  console.error('    این پروژه به Node.js 22.13 یا جدیدتر نیاز دارد (به‌خاطر ماژول داخلی node:sqlite).');
  console.error('');
  console.error('  ✗ Your Node.js version is too old: v' + process.versions.node);
  console.error('    This project needs Node.js 22.13 or newer (built-in node:sqlite).');
  console.error('    https://nodejs.org');
  console.error('');
  process.exit(1);
}

/* ---------- ۲) ساخت .env در صورت نبود ---------- */
function ensureEnv() {
  const envPath = path.join(root, '.env');
  if (fs.existsSync(envPath)) return;
  try { require('../config/env').ensureEnv(); }
  catch (e) { /* ادامه بده؛ خود سرور هم .env را می‌سازد */ }
}

/* ---------- ۳) npm install در صورت نبود node_modules ---------- */
function installIfNeeded(done) {
  if (fs.existsSync(path.join(root, 'node_modules', 'express'))) {
    console.log('✔ وابستگی‌ها نصب شده‌اند.');
    return done();
  }
  console.log('… در حال نصب وابستگی‌ها (npm install) — ممکن است یک دقیقه طول بکشد');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const p = spawn(npm, ['install', '--no-audit', '--no-fund'], { cwd: root, stdio: 'inherit', shell: true });
  p.on('exit', (code) => {
    if (code !== 0) {
      console.error('✗ npm install ناموفق بود. لطفاً دستور زیر را دستی اجرا کنید: npm install');
      process.exit(1);
    }
    console.log('✔ وابستگی‌ها نصب شد.');
    done();
  });
}

/* ---------- ۴) ساخت دیتابیس در صورت نبود ---------- */
function seedIfNeeded(done) {
  const dbFile = path.join(root, 'data', 'store.db');
  if (fs.existsSync(dbFile)) {
    console.log('✔ دیتابیس آماده است.');
    return done();
  }
  console.log('… دیتابیس نمونه ساخته می‌شود (npm run seed)');
  const p = spawn(process.execPath, [path.join(root, 'scripts', 'seed.js')], { cwd: root, stdio: 'inherit' });
  p.on('exit', (code) => {
    if (code !== 0) { console.error('✗ ساخت دیتابیس نمونه ناموفق بود.'); process.exit(1); }
    console.log('✔ دیتابیس نمونه ساخته شد.');
    done();
  });
}

/* ---------- ۵) باز کردن مرورگر ---------- */
function openBrowser(url) {
  const platform = process.platform;
  const isTermux = !!process.env.PREFIX && /com.termux/i.test(process.env.PREFIX);
  let cmd;
  if (isTermux) cmd = `termux-open-url "${url}"`;
  else if (platform === 'win32') cmd = `start "" "${url}"`;
  else if (platform === 'darwin') cmd = `open "${url}"`;
  else cmd = `xdg-open "${url}"`;

  try {
    execSync(cmd, { stdio: 'ignore', shell: true, timeout: 8000 });
    console.log('▸ مرورگر باز شد: ' + url);
  } catch (e) {
    if (isTermux || platform === 'linux') {
      try { execSync(`termux-open-url "${url}"`, { stdio: 'ignore', timeout: 8000 }); }
      catch (e2) { console.log('▸ مرورگر باز نشد؛ لینک را دستی باز کنید: ' + url); }
    } else {
      console.log('▸ لینک را دستی در مرورگر باز کنید: ' + url);
    }
  }
}

/* ---------- ۶) اجرای سرور ---------- */
function startServer() {
  const logFile = path.join(root, 'data', 'server.log');
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });

  console.log('');
  console.log('  یدک‌یار در حال راه‌اندازی است... / Starting the store...');
  console.log('  ─────────────────────────────────────────────');

  if (background) {
    const out = fs.openSync(logFile, 'a');
    const child = spawn(process.execPath, ['app.js'], { cwd: root, detached: true, stdio: ['ignore', out, out] });
    fs.writeFileSync(path.join(root, 'data', 'server.pid'), String(child.pid));
    child.unref();

    let waited = 0;
    const timer = setInterval(() => {
      waited += 300;
      let log = '';
      try { log = fs.readFileSync(logFile, 'utf8'); } catch (e) { /* ignore */ }
      const m = log.match(/SITE_URL=(\S+)/g);
      if (m && m.length) {
        clearInterval(timer);
        const url = m[m.length - 1].split('=')[1];
        console.log('');
        console.log('  ✔ سایت در پس‌زمینه اجرا شد: ' + url);
        console.log('  Site is running in the background.');
        openBrowser(url);
        console.log('');
        console.log('  برای توقف سرور:');
        console.log('    kill $(cat data/server.pid)      # لینوکس/ترمکس');
        console.log('    taskkill /PID <شماره PID> /T     # ویندوز');
        console.log('  To stop the server: kill $(cat data/server.pid)');
        console.log('');
        process.exit(0);
      }
      if (waited >= 60000) {
        clearInterval(timer);
        console.log('✗ سرور بالا نیامد. لاگ را ببینید: data/server.log');
        process.exit(1);
      }
    }, 300);
    return;
  }

  const child = spawn(process.execPath, ['app.js'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let opened = false;
  const onData = (buf) => {
    const text = buf.toString();
    process.stdout.write(text);
    const m = text.match(/SITE_URL=(\S+)/);
    if (m && !opened) {
      opened = true;
      console.log('  ─────────────────────────────────────────────');
      console.log('  سایت آماده است. این پنجره را نبندید تا سایت روشن بماند.');
      console.log('  Site is running. Close this window to stop.');
      console.log('  ─────────────────────────────────────────────');
      openBrowser(m[1]);
    }
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('exit', (code) => {
    console.log('');
    console.log('  سرور متوقف شد. / Server stopped.');
    process.exit(code == null ? 0 : code);
  });
  const stop = () => { try { child.kill(); } catch (e) { /* ignore */ } };
  process.on('SIGINT', () => { stop(); process.exit(0); });
  process.on('SIGTERM', () => { stop(); process.exit(0); });
}

/* ---------- شروع ---------- */
checkNode();
ensureEnv();
installIfNeeded(() => seedIfNeeded(startServer));
