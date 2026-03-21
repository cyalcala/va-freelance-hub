const http = require('http');

const server = http.createServer((req, res) => {
  setTimeout(() => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data: {
        children: [
          { data: { title: '[Hiring] Test Job', url: 'http://test.com', created_utc: 12345 } }
        ]
      }
    }));
  }, 500); // 500ms latency
});

server.listen(8080, () => console.log('Mock server running on port 8080'));
