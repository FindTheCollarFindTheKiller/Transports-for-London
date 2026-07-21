const https = require('https');

const TFL_OPTIONS = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
  }
};

const url = 'https://api.tfl.gov.uk/Line/Mode/tube/Arrivals';
console.log('Fetching', url);
const start = Date.now();
https.get(url, TFL_OPTIONS, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Time: ${Date.now() - start}ms`);
    if (res.statusCode === 200) {
      try {
        const parsed = JSON.parse(data);
        console.log(`Count: ${parsed.length}`);
      } catch (e) {
        console.error('Parse error:', e);
      }
    } else {
      console.log('Response:', data.substring(0, 200));
    }
  });
}).on('error', (e) => {
  console.error('Error:', e);
});
