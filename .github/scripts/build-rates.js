/* Собирает компактный data/rates.json из полного фида ЦБ.
 * Запускается в workflow rates.yml: node .github/scripts/build-rates.js */
'use strict';
const fs = require('fs');

const d = JSON.parse(fs.readFileSync('/tmp/daily.json', 'utf8'));
const pick = (v) => (v ? { value: v.Value, prev: v.Previous } : null);
const out = {
  source: 'https://www.cbr-xml-daily.ru/ (public CBR feed, no keys)',
  date: d.Date,
  usd: pick(d.Valute.USD),
  eur: pick(d.Valute.EUR),
  cny: pick(d.Valute.CNY)
};
fs.writeFileSync('data/rates.json', JSON.stringify(out, null, 2) + '\n');
