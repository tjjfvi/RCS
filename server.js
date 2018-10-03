
const express = require("express");
const server = express();
const router = express.Router();

const globby = require("globby");

const fs = require("fs-extra");

const createLoadPath = require("./createLoadPath.js");

let nextLoadSvg = createLoadPath();

router.get("/js/preloadDependencies.js", async (req, res) => {
	let paths = await fs.readdir(__dirname + "/static/js/");

	paths.sort();

	let slicedPaths = paths.map(p => p.slice(0, -3));

	let properties = slicedPaths.map(p => `\t${JSON.stringify(p)}: require(${JSON.stringify("./" + p)}),`);

	let js = `module.exports = {\n${properties.join("\n")}\n}`;

	res.set("Content-Type", "text/javascript").send(js);
})

router.get("/sw.js", async (req, res) => {
	let fileName = process.env.NODE_ENV === "production" ? "sw-prod.js" : "sw-dev.js";
	res.set("Content-Type", "text/javascript").send(await fs.readFile(__dirname + "/static/" + fileName));
})

router.get("/loading.svg", (req, res) => {
	res.set("Content-Type", "image/svg+xml").send(nextLoadSvg);
	nextLoadSvg = createLoadPath();
})

router.use(express.static(__dirname + "/static"));

if(require.main === module) {
	server.use(router);
	server.listen(process.env.PORT || 35452);
}

module.exports = router;
