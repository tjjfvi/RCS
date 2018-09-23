
module.exports = ({
	Pieces: {
		faces,
	},
	Utils: {
		findFace,
	}
}) => {
	const moveRegex = /^(?:([FBLRUD])(w?)|([xyzXYZ])|([MES]))('?2?)$/;

	const presets = {
		t: "R U R' U' R' F R2 U' R' U' R U R' F'",
		ja: "R U R' F' R U R' U' R' F R2 U' R' U'",
		jb: "y2 L' U2 L U L' U2 R U' L U R' y2",
		y: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
		ra: "L U2 L' U2 L F' L' U' L U L F L2 U",
	};

	return {
		presets,
		interpret,
	};

	function interpret(a){
		return a.trim().split(/\s+/g).map(moveStr => {
			let m = moveRegex.exec(moveStr);
			if(!m) return { orig: moveStr };

			let stringified = moveStr;

			const amount = {
				"":    1,
				"'":  -1,
				"2":   2,
				"'2": -2,
			}[m[5]];

			if(m[1]) {
				let face = faces[m[1].toLowerCase()];
				return {
					face: { faceKey: findFace(face.axis, (m[2] ? -1 : 1) * face.dir), amount },
					cube: { faceKey: m[1].toLowerCase(), amount: m[2].length * amount },
					stringified,
				};
			}

			if(m[3]) return {
				cube: { faceKey: "ruf"["xyz".split("").indexOf(m[3].toLowerCase())], amount },
				stringified,
			};

			if(m[4]) {
				let faceKey = "rub"["mes".split("").indexOf(m[4].toLowerCase())];
				return {
					cube: { faceKey, amount: -amount },
					face: { faceKey, double: true, amount },
					stringified,
				};
			}
		});
	}
}
