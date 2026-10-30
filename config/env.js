/**
 * config/env.js
 * اگر فایل .env وجود نداشته باشد، آن را از روی .env.example می‌سازد و
 * SESSION_SECRET را به‌صورت تصادفی جایگزین می‌کند. (Create .env on first run.)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

function ensureEnv() {
  if (fs.existsSync(envPath)) return false;
  let template = 'PORT=3000\nSESSION_SECRET=' + crypto.randomBytes(32).toString('hex') + '\n';
  if (fs.existsSync(examplePath)) {
    template = fs.readFileSync(examplePath, 'utf8');
    const secret = crypto.randomBytes(32).toString('hex');
    if (/^SESSION_SECRET=.*$/m.test(template)) {
      template = template.replace(/^SESSION_SECRET=.*$/m, 'SESSION_SECRET=' + secret);
    } else {
      template += '\nSESSION_SECRET=' + secret + '\n';
    }
  }
  fs.writeFileSync(envPath, template, { encoding: 'utf8' });
  console.log('[env] فایل .env ساخته شد (SESSION_SECRET تصادفی). / .env created with a random SESSION_SECRET.');
  return true;
}

module.exports = { ensureEnv };
