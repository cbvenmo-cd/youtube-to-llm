const http = require('http');

console.log('Testing server connectivity...');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log('Response:', chunk.toString());
  });
});

req.on('error', (error) => {
  console.error('Connection error:', error.message);
});

req.on('timeout', () => {
  console.error('Request timed out');
  req.destroy();
});

req.end();
