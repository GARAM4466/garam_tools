const https = require('https');

https.get('https://api.bithumb.com/v1/market/all', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('v1/market/all status:', res.statusCode, 'data size:', Math.round(data.length/1024), 'KB'));
}).on('error', err => console.log('Error:', err.message));

https.get('https://api.bithumb.com/public/ticker/ALL_KRW', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('public/ticker/ALL_KRW status:', res.statusCode, 'data size:', Math.round(data.length/1024), 'KB'));
}).on('error', err => console.log('Error:', err.message));
