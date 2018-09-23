
module.exports = ({
	Pieces: {
		faces,
		pieceKeys,
		pieces,
	},
}) => {
	Math.tau = 6.283185307179586;

	Date.tick = function(){
		let now = Date.now();
		let lastTime = Date.tick.lastTime || now;
		Date.tick.lastTime = now;
		Date.delta = now - lastTime;
	}

	return {
		findPiece,
		rotateKey,
		findRotation,
		rotateMovesY,
		inMiddleLayer,
		findFace,
	}

	function findFace(axis, dir) {
		return Object.entries(faces).filter(([key, face]) => face.dir === dir && face.axis === axis)[0][0];
	}

	function rotateKey(key, faceKey, amount, modify = false){
		const { axis, dir } = faces[faceKey];
		const rotateGuide = [
			[(axis + 2) % 3, +1],
			[(axis + 1) % 3, +1],
			[(axis + 2) % 3, -1],
			[(axis + 1) % 3, -1]
		];
		const rotate = (axis, dir) => rotateGuide[(rotateGuide.indexOf(rotateGuide.filter(([a, d]) => a === axis && d === dir)[0]) + faces[faceKey].dir + 4) % 4];
		let rotKey = key.split("").map(f =>
			faces[f].axis === axis || amount === 0 ?
				f
			: Math.abs(amount) === 2 ?
				findFace(faces[f].axis, faces[f].dir * -1)
			:
				findFace(...rotate(faces[f].axis, faces[f].dir * amount))
		).join("");
		if(modify) pieces[key.split("").sort().join("")].userData.key = rotKey;
		return rotKey.split("").sort().join("");
	}

	function findPiece(key){
		return pieces[pieceKeys.filter(k => pieces[k].userData.originalPiece === key)[0]];
	}

	function findRotation(faceKey, key, goalKey){
		let rot = {
			faceKey,
			amount: [0, 1, -1, 2].filter(a => rotateKey(key, faceKey, a) === goalKey)[0],
		};
		return rot;
	}

	function rotateMovesY(moves, from, to){
		let { amount } = findRotation("u", from, to);
		return moves.map(m => {
			let f = m => {
				m.faceKey = rotateKey(m.faceKey, "u", amount);
			};
			f(m.face);
			f(m.cube);
			return m;
		});
	}

	function inMiddleLayer(key){
		return !key.includes("u") && !key.includes("d");
	}
}
