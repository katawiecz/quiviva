const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  const filePath = path.join(process.cwd(), 'data', 'counter.json');

  // jeśli nie ma pliku - stwórz
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ count: 0 }, null, 2));
  }

  // odczytaj licznik
  const fileData = fs.readFileSync(filePath, 'utf-8');
  let data = JSON.parse(fileData);

  // zwiększ i zapisz
  data.count += 1;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  res.setHeader("Content-Type", "application/json");
  res.status(200).json({ visits: data.count });
};
