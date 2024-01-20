const http = require("http");

http
  .createServer((req, res) => {
    res.write("<h1>MY name is JOHN AY</h1>");
    res.end("Hello World!");
  })
  .listen(3000);
