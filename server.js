
const express = require("express");
const server = express();
const router = express.Router();

const globby = require("globby");

const fs = require("fs-extra");

const createLoadPath = require("./createLoadPath.js");

let nextLoadSvg = createLoadPath();

router.get("/jsFiles.json", async (req, res) => {
	let paths = await fs.readdir(__dirname + "/static/js/");

	paths.sort();

	let stats = await Promise.all(paths.map(p => fs.stat(__dirname + "/static/js/" + p)));

	let slicedPaths = paths.map(p => p.slice(0, -3));

	let properties = slicedPaths.map((p, i) => `\t${JSON.stringify(p)}: { "size": ${stats[i].size} },`);

	let json = `{\n${properties.join("\n").slice(0, -1)}\n}`;

	res.set("Content-Type", "application/json").send(json);
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
