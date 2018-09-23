
module.exports = ({
	Pieces: {
		faces,
		centerKeys,
		edgeKeys,
		cornerKeys,
		pieceKeys,
		pieces,
	},
	Rotate: {
		rotate,
	},
	Utils: {
		findPiece,
		rotateKey,
		findRotation,
		rotateMovesY,
		inMiddleLayer,
		findFace,
	},
	Algorithms,
}) => {
	return {
		orient,
		solve,
		solveWhiteCross,
		solveWhiteFace,
		solveSecondLayer,
		solveYellowCross,
		solveYellowFace,
		solveYellowCorners,
		solveYellowEdges,
	};

	function orient(){
		["d", "f"].map(k => {
			let piece = findPiece(k);
			let { axis, dir } = faces[piece.userData.key];
			let goalAxis = faces[k].axis;
			let goalDir = faces[k].dir;

			if(axis === goalAxis && dir === goalDir) return;

			let rotAxis = _.xor([1, 0, 2], [axis, goalAxis])[0];
			let faceKey = findFace(rotAxis, 1);

			rotate({ cube: findRotation(faceKey, piece.userData.key, k) });
		});
	}

	function solveWhiteCross(){
		orient();

		edgeKeys.filter(k => k.includes("d")).filter(k => {
			const piece = findPiece(k);
			let { key, originalPiece } = piece.userData;
			let otherFaceKey = originalPiece.split("").filter(s => s !== "d")[0];

			if(key === originalPiece) return;
			if(key.split("").reverse().join("") === originalPiece)
				return genFlip().map(rotate);

			let coloredPos = key[originalPiece.indexOf(otherFaceKey)];
			let flip = false;

			if(faces[coloredPos].axis === 1) {
				flip = true;
				coloredPos = key.split("").filter(k => k !== coloredPos).join("");
			}

			if(coloredPos === otherFaceKey) {
				rotate({ face: findRotation(otherFaceKey, key, originalPiece) });
				if(flip) genFlip().map(rotate);
			}

			let newKey = [coloredPos, "u"].sort().join("");
			let rot = findRotation(coloredPos, key, newKey);
			if(rot.amount) rotate({ face: rot });

			rotate({ face: findRotation("u", newKey, [otherFaceKey, "u"].sort().join("")) });

			rotate({ face: { faceKey: rot.faceKey, amount: -rot.amount }})

			if(piece.userData.key !== k) rotate({ face: { faceKey: otherFaceKey, amount: 2 } });

			if(flip) genFlip().map(rotate);

			return true;

			function genFlip(){
				return [
					{ face: { faceKey: otherFaceKey, amount: 1 } },
					...Algorithms.interpret("Uw'"),
					{ face: { faceKey: otherFaceKey, amount: 1 } },
					...Algorithms.interpret("Uw"),
				];
			}
		});
	}

	function solveWhiteFace(){
		solveWhiteCross();

		cornerKeys.filter(k => k.includes("d")).map(k => {
			const piece = findPiece(k);
			let { key, originalPiece } = piece.userData;

			if(key === originalPiece) return;

			if(key.includes("d")) {
				let fs = key.split("").filter(k => k !== "d").reverse();
				let algorithm = findRotation("u", ...fs).amount === -1 ? "R U R'" : "L' U' L";
				let moves = Algorithms.interpret(algorithm);
				rotateMovesY(moves, "f", fs[0]).map(rotate);
				({ key, originalPiece } = piece.userData);
			}

			let otherFaces = originalPiece.split("").filter(f => f !== "d");
			let sideFaces = originalPiece.split("").filter((_, i) => i !== key.indexOf("u"));
			let possibleFaces = _.intersection(sideFaces, otherFaces);

			rotate({ face: findRotation("u", key, otherFaces.concat("u").sort().join("")) });

			({ key, originalPiece } = piece.userData);

			let algorithmss = [
				["R U R'", "L' U' L"],
				["R U2 R' U' R U R'", "L' U2 L U L' U' L"],
			];

			let algorithms = algorithmss[key[originalPiece.indexOf("d")] === "u" ? 1 : 0];

			let ind = findRotation("u", possibleFaces[0], possibleFaces[1] || key[originalPiece.indexOf("d")]).amount === 1 ? 1 : 0;

			let algorithm = algorithms[ind];

			rotateMovesY(Algorithms.interpret(algorithm), ind ? "f" : "f", possibleFaces[0]).map(rotate);

			return true;
		});
	}

	function solveSecondLayer(){
		solveWhiteFace();

		edgeKeys.filter(inMiddleLayer).map(k => {
			const piece = findPiece(k);
			let { key, originalPiece } = piece.userData;

			let algorithms = [
				"R U R' U' F' U' F",
				"L' U' L U F U F'",
			];

			if(key === originalPiece) return;

			if(inMiddleLayer(key)) {
				let fs = key.split("").reverse();
				let algorithm = algorithms[findRotation("u", ...fs).amount === -1 ? 0 : 1];
				let moves = Algorithms.interpret(algorithm);
				rotateMovesY(moves, "f", fs[0]).map(rotate);
				({ key } = piece.userData);
			}

			let topFace = originalPiece[key.indexOf("u")];
			let sideFace = originalPiece[+!key.indexOf("u")];
			let topOppositeFace = findFace(faces[topFace].axis, -faces[topFace].dir);

			rotate({ face: findRotation("u", key, ["u", topOppositeFace].sort().join("")) });

			({ key } = piece.userData);

			let ind = findRotation("u", sideFace, topOppositeFace).amount === 1 ? 0 : 1;

			let algorithm = algorithms[ind];

			rotateMovesY(Algorithms.interpret(algorithm), "f", sideFace).map(rotate);

			return true;
		});
	}

	function solveYellowCross(){
		solveSecondLayer();

		let algorithms = {
			ffff: "F U R U' R' F' U F U R U' R' U R U' R' F' U'",
			tftf: "F U R U' R' U R U' R' F'",
			ttff: "F U R U' R' F'",
			tttt: "",
		};

		let flips = ["lu", "bu", "ru", "fu"].map(k => k.split("").sort().join("")).map(k =>
			pieces[k].userData.originalPiece[pieces[k].userData.key.indexOf("u")] === "u"
		);

		let algorithm, r;

		let stringifyFlips = f => f.map(b => b? "t" : "f").join("")

		for(r = 0; (algorithm = algorithms[stringifyFlips(flips)]) === undefined; r++)
			flips.unshift(flips.pop());

		let amount = [0, 1, 2, -1][r];

		if(algorithm) rotateMovesY(Algorithms.interpret(algorithm), "f", rotateKey("f", "u", -amount)).map(rotate);
	}

	function solveYellowFace(){
		solveYellowCross();

		let rAl = "R U R' U R U2 R'";
		let lAl = "L' U' L U' L' U2 L";

		let algorithms = {
			uuuu: ``,
			ubrf: `${rAl}`,
			flbu: `${lAl}`,
			llrr: `${rAl} ${rAl}`,
			fbuu: `${rAl} ${lAl}`,
			lbbr: `${rAl} U ${rAl}`,
			furu: `${rAl} U' ${lAl}`,
			fuuf: `${rAl} U2 ${lAl}`,
		};

		let twists = ["lfu", "blu", "rbu", "fru"].map(k => k.split("").sort().join("")).map(k =>
			pieces[k].userData.key[pieces[k].userData.originalPiece.indexOf("u")]
		);

		let algorithm, r;

		for(r = 0; (algorithm = algorithms[twists.join("")]) === undefined; r++) {
			twists.unshift(twists.pop());
			twists = twists.map(t => rotateKey(t, "u", 1));
			if(r > 5) throw "";
		}

		let amount = [0, 1, 2, -1][r];

		if(algorithm) rotateMovesY(Algorithms.interpret(algorithm), "f", rotateKey("f", "u", -amount)).map(rotate);
	}

	function solveYellowCorners(){
		solveYellowFace();

		let algorithm = "R' F R' B2 R F' R' B2 R2 U";

		let matchingSides = centerKeys.filter(inMiddleLayer).filter(f => {
			let findOriginal = a => {
				let { key, originalPiece } = pieces[[rotateKey(f, "u", a), f, "u"].sort().join("")].userData;
				return originalPiece[key.indexOf(f)];
			}

			return findOriginal(1) === findOriginal(-1);
		});

		switch(matchingSides.length){
			case 0:
				let moves = Algorithms.interpret(algorithm);
				moves.map(rotate);
				moves.map(rotate);
				break;

			case 1:
				rotateMovesY(Algorithms.interpret(algorithm), "b", matchingSides[0]).map(rotate)
				break;

			case 4: break;
		}

		let { key, originalPiece } = findPiece(cornerKeys.filter(k => k.includes("u"))[0]).userData;

		rotate({ face: findRotation("u", key.split("").sort().join(""), originalPiece) });
	}

	function solveYellowEdges(){
		solveYellowCorners();

		let permuteLastEdges = () => {

			let algorithm = "F2 U M' U2 M U F2";

			let matchingSides = centerKeys.filter(inMiddleLayer).filter(f => {
				let key = ["u", f].sort().join("");
				return pieces[key].userData.originalPiece === key;
			});

			switch(matchingSides.length){
				case 0:
				case 1:
					rotateMovesY(Algorithms.interpret(algorithm), "b", matchingSides[0] || "b").map(rotate);
					permuteLastEdges();
					break;

				case 4: break;
			}

		};

		permuteLastEdges();
	}

	function solve(){
		solveYellowEdges();
	}
}
