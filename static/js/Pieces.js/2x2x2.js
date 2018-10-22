
module.exports = (modules) => {

	return require("index/Pieces")({ ...modules, config: {
		...modules.config,
		"2x2x2": true,
	}});

}
