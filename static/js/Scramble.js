
module.exports = ({
	Rotate: {
		rotate
	},
	Algorithms,
}) => {
	return {
		generate,
		command,
	}

	function generate(){
		let turns = [..."RUFLBDxyzMES".split(""), ..."RUFLBD".split("").map(s => s + "w")];
		let directions = " 2 '".split(" ");
		let scramble = [...Array(25)].map(() =>
			turns[Math.floor(Math.random() * turns.length)] +
			directions[Math.floor(Math.random() * directions.length)]
		).join(" ");
		return scramble;
	}

	function command(){
		return Algorithms.interpret(generate()).map(rotate);
	}
}
