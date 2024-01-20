import http from "http";

http
  .createServer((req, res) => {
    res.write("<h1>MY name is John AY</h1>");
    res.end("Hello World!");
  })
  .listen(3000);
