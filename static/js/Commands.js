
module.exports = ({
	Solve,
	Scramble,
	Rotate: {
		rotate,
		changeSpeed,
	},
	Pieces: {
		pieceKeys,
		pieces,
	},
	Utils: {
		findPiece,
	}
}) => {
	const t = three = THREE;

	const commands = {
		...Solve,
		save,
		reset,
		orient: Solve.orient,
		scramble: Scramble.command,
		insta: () => changeSpeed(true),
		slow: () => changeSpeed(false),
		toggleBlindfold,
	};

	let blindfoldMode = false;
	let blindfoldMaterial = new t.MeshStandardMaterial({ color: 0x151820 });

	return { commands };

	function save(){
		let cubeString = pieceKeys.map(k => findPiece(k).userData.key).join("-");
		history.pushState(null, null, `?cube=${encodeURI(cubeString)}`)
	}

	function reset(){
		history.pushState(null, null, "?");
	}

	function toggleBlindfold(){
		blindfoldMode = !blindfoldMode;
		[].concat(...pieceKeys.map(k => pieces[k].children)).map(tile => {
			tile.material = blindfoldMode ? blindfoldMaterial : tile.userData.material;
		});
	}
};
