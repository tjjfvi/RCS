
const express = require("express");
const server = express();
const router = express.Router();

const globby = require("globby");

const fs = require("fs-extra");

router.use(express.static(__dirname + "/static"));

router.get("/js/preloadDependencies.js", async (req, res) => {
	let paths = await globby([
		"static/js/**",
		"!static/js/index.js",
	]);

	paths.sort();

	let slicedPaths = paths.map(p => p.slice(10, -3));

	let properties = slicedPaths.map(p => `\t${JSON.stringify(p)}: require(${JSON.stringify("./" + p)}),`);

	let js = `module.exports = {\n${properties.join("\n")}\n}`;

	res.set("Content-Type", "text/javascript").send(js);
})

router.get("/sw.js", async (req, res) => {
	let fileName = process.env.NODE_ENV === "production" ? "sw-prod.js" : "sw-dev.js";
	res.set("Content-Type", "text/javascript").send(await fs.readFile(__dirname + "/static/" + fileName));
})

if(require.main === module) {
	server.use(router);
	server.listen(process.env.PORT || 35452);
}

module.exports = router;
