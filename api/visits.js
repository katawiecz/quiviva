// visits.js
const fs = require('fs');
const path = require('path');

const RATE_WINDOW_MS = 60_000; // 1 min
const RATE_MAX = 20; // np. 20 żądań/min/IP
const ipHits = new Map();

function tooMany(req) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now();
  const arr = (ipHits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  arr.push(now);
  ipHits.set(ip, arr);
  return arr.length > RATE_MAX;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {                 // <— akceptuj tylko GET
    return res.status(405).json({ error: 'Only GET allowed' });
  }
  if (tooMany(req)) {                         // <— prosty 429
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too Many Requests' });
  }

  const filePath = path.join(process.cwd(), 'data', 'counter.json');

  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ count: 0 }, null, 2));
  }

  const fileData = fs.readFileSync(filePath, 'utf-8');
  let data = JSON.parse(fileData);

  data.count += 1;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ visits: data.count });
};