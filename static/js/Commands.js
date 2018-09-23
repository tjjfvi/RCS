
module.exports = ({
	Solve,
	Scramble,
	Blindfold,
	Rotate: {
		rotate,
		changeSpeed,
	},
	Pieces: {
		pieceKeys,
	},
	Utils: {
		findPiece,
	}
}) => {
	const commands = {
		...Solve,
		save,
		reset,
		orient: Solve.orient,
		scramble: Scramble.command,
		insta: () => changeSpeed(true),
		slow: () => changeSpeed(false),
		toggleBlindfold: Blindfold.toggle,
	};

	return { commands };

	function save(){
		let cubeString = pieceKeys.map(k => findPiece(k).userData.key).join("-");
		history.pushState(null, null, `?cube=${encodeURI(cubeString)}`)
	}

	function reset(){
		history.pushState(null, null, "?");
	}
};
