
const express = require("express");
const server = express();

server.use(express.static("static"));

server.listen(process.env.PORT || 35452);
