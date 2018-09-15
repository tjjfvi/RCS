
const express = require("express");
const server = express();
const router = express.Router();

const path = require("path");

router.use(express.static(__dirname + "/static"));
console.log(__dirname + "static");


if(require.main === module) {
	server.use(router);
	server.listen(process.env.PORT || 35452);
}

module.exports = router;
