
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

router.get("/js/*", async (req, res, next) => {
	let base = req.url.slice(4);
	let variation = req.baseUrl.slice(1) || "index";

	console.log(base, variation);

	let path = __dirname + "/static/js/" + base;

	let stats = await fs.stat(path);

	if(stats.isFile())
		return res.sendFile(path);

	return res.sendFile(path + "/" + variation + ".js");
});

router.get("/", (req, res) => res.sendFile(__dirname + "/static/" + "index.html"));

router.use(async (req, res, next) => {
	let path = __dirname + "/static/" + req.url

	if(await fs.exists(path)) return res.sendFile(path);

	next();
});

require("./variants.json").map(v => {
	router.get("/" + v, (req, res, next) => {
		if(!req.url.endsWith("/"))
			return res.redirect(req.baseUrl + req.url + "/");

		next();
	});
	router.use("/" + v, router);
})

if(require.main === module) {
	server.use(router);
	server.listen(process.env.PORT || 35452);
}

module.exports = router;
