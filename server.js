
const express = require("express");
const server = express();
const router = express.Router();

const globby = require("globby");

const fs = require("fs-extra");

const createLoadPath = require("./createLoadPath.js");

const variants = require("./variants.json");

const variantAliases = new Proxy({}, {
	get: (target, key) =>
		target[key] || resolveVariantAliases(key)
});

let nextLoadSvg = createLoadPath();

router.get("/jsFiles.json", async (req, res) => {
	let variant = req.baseUrl.slice(1) || "index";

	let paths = await fs.readdir(__dirname + "/static/js/");

	paths.sort();

	let redact = stats => ({ size: stats.size });

	let statss = {};

	let addStats = file => {
		let key = file.slice(0, -3);

		if(statss[key]) return statss[key];

		statss[key] = (async () => {

			let [v, b] = key.includes("/") ? file.split("/") : [variant, file];

			let [path, variantUsed] = await resolveVariantPath(b, v, true);

			if(v !== variant && (!variantUsed || (v !== variant && v !== "index" && variantUsed === "index")))
				return;

			return redact(await fs.stat(path));

		})()

		return statss[key];
	}

	let addStatss = (base, variant, relative) => {
		addStats((relative ? "" : variant + "/") + base);

		variants[variantAliases[variant]].map(variant =>
			addStatss(base, variant, false)
		);
	};

	paths.map(p => addStatss(p, variant, true));

	statss = Object.assign({}, ...(await Promise.all(Object.entries(statss).map(async ([k, v]) => ({ [k]: await v })))));

	let json = JSON.stringify(statss);

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
	let variant = req.baseUrl.slice(1) || "index";

	if(base.split("/").length === 2)
		[variant, base] = base.split("/");

	return res.sendFile(await resolveVariantPath(base, variant));
});

router.get("/", (req, res) => res.sendFile(__dirname + "/static/" + "index.html"));

router.use(async (req, res, next) => {
	let path = __dirname + "/static/" + req.url

	if(await fs.exists(path)) return res.sendFile(path);

	next();
});

Object.keys(variants).map(variant => {
	router.get("/" + variant, (req, res, next) => {
		if(!req.url.endsWith("/"))
			return res.redirect(req.baseUrl + req.url + "/");

		next();
	});
	router.use("/" + variant, router);
})

function resolveVariantAliases(variant){
	while(typeof variants[variant] === "string")
		variant = variants[variant];

	return variant;
}

async function resolveVariantPath(base, variant, giveVariant = false){
	variant = variantAliases[variant];

	let path = __dirname + "/static/js/" + base;

	let stats = await fs.stat(path);

	if(stats.isFile())
		return giveVariant ? [path, ""] : path;

	let variantPath;

	let fallbacks = (variants[variant] || []).concat(["index"]);

	while(!(await fs.exists(variantPath = path + "/" + variant + ".js")))
		variant = fallbacks.shift();

	return giveVariant ? [variantPath, variant] : variantPath;
}

if(require.main === module) {
	server.use(router);
	server.listen(process.env.PORT || 35452);
}

module.exports = router;
