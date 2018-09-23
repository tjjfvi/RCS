$(() => {
	const cubeletSize = .628;
	const tileThickness = .05;
	const cubeletSeperation = .05;

	const commands = {
		solve,
		save,
		reset,
		orient,
		scramble: () => interpretAlgorithm(genScramble()).map(rotate),
		insta: () => [
			faceRotation,
			cubeRotation,
			...faceRotationQueue,
			...cubeRotationQueue
		].map(r => r && (r.insta = true)),
		slow: () => [
			faceRotation,
			cubeRotation,
			...faceRotationQueue,
			...cubeRotationQueue
		].map(r => r && (r.insta = false)),
		solveWhiteCross,
		solveWhiteFace,
		solveSecondLayer,
		solveYellowCross,
		solveYellowFace,
		solveYellowCorners,
		solveYellowEdges,
	};

	const presetAlgorithms = {
		t: "R U R' U' R' F R2 U' R' U' R U R' F'",
		ja: "R U R' F' R U R' U' R' F R2 U' R' U'",
		jb: "y2 L' U2 L U L' U2 R U' L U R' y2",
		y: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
		ra: "L U2 L' U2 L F' L' U' L U L F L2 U",
	};

	Math.tau = 6.283185307179586;

	Date.tick = function(){
		let now = Date.now();
		let lastTime = Date.tick.lastTime || now;
		Date.tick.lastTime = now;
		Date.delta = now - lastTime;
	}

	const moveRegex = /^(?:([FBLRUD])(w?)|([xyzXYZ])|([MES]))('?2?)$/;

	const faces = {
		f: { color: 0x0984e3, name: "Front", axis: 2, dir:  1 },
		b: { color: 0x27ae60, name:  "Back", axis: 2, dir: -1 },
		l: { color: 0xd35400, name:  "Left", axis: 0, dir: -1 },
		r: { color: 0xc0392b, name: "Right", axis: 0, dir:  1 },
		u: { color: 0xf1c40f, name:    "Up", axis: 1, dir:  1 },
		d: { color: 0xecf0f1, name:  "Down", axis: 1, dir: -1 },
	};
	const centerKeys = Object.keys(faces);
	const edgeKeys = [].concat(...Object.keys(faces).map(a =>
		centerKeys
			.filter(b => faces[b].axis !== faces[a].axis)
			.filter(b => a < b)
			.map(b => a + b)
	));
	const cornerKeys = [].concat(...[].concat(...Object.keys(faces).map(a =>
		centerKeys
			.filter(b => faces[b].axis !== faces[a].axis)
			.filter(b => a < b)
			.map(b =>
				centerKeys
					.filter(c => faces[c].axis !== faces[b].axis && faces[c].axis !== faces[a].axis)
					.filter(c => b < c)
					.map(c => a + b + c)
			)
	)));
	const pieceKeys = [].concat(centerKeys, edgeKeys, cornerKeys);

	const pieces = {};

	let faceRotation = null;
	let faceRotationQueue = [];

	let cubeRotation = null;
	let cubeRotationQueue = [];

	const displayRotations = [];
	let displayRotationsStart = 0;

	const queryParams = Object.assign(...location.search.slice(1).split("&").map(s =>
		({ [s.split("=")[0]]: s.split("=").slice(1).join("=") })
	));

	const t = three = THREE;

	const scene = new t.Scene();
	const camera = new t.PerspectiveCamera(60, window.innerWidth / window.innerHeight, .1, 1000);
	const renderer = new t.WebGLRenderer({ antialias: true });

	camera.position.z += 5;

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = t.PCFShadowMap;
	renderer.setSize(window.innerWidth, window.innerHeight);
	$(renderer.domElement).insertBefore(".loading");

	const cube = new t.Group();
	cube.name = "Cube";

	const lights = [
		[new t.Vector3(0,  5, -1), .75],
		[new t.Vector3(7,  0, -1), .75],
		[new t.Vector3(0,  0,  5),   2],
		[new t.Vector3(0,  0, -2), .25],
	].map(([position, intensity]) => {

		let light = new t.PointLight(0xffffff, intensity);

		light.castShadow = true;
		light.shadow = new t.LightShadow(new t.PerspectiveCamera(50, 1, 10, 2500));
		light.shadow.bias = 0.0001;
		light.shadow.mapSize.width = 2048;
		light.shadow.mapSize.width = 1024;

		light.position.copy(position);

		return light;

	});

	const faceRotateGroup = new t.Group();
	faceRotateGroup.name = "Rotate Group";

	const cubeRotateGroup = new t.Group();
	cubeRotateGroup.name = "Rotate Group";

	cubeRotateGroup.add(cube);
	cube.add(faceRotateGroup);

	const cubeViewGroup = new t.Group();

	cubeViewGroup.rotation.x = Math.tau/16;
	cubeViewGroup.rotation.y = -Math.tau/16;

	cubeViewGroup.add(cubeRotateGroup);

	scene.add(cubeViewGroup, ...lights, new t.AmbientLight(0xffffff, 0));

	scene.background = new t.Color(0x151820);

	(queryParams.cube || pieceKeys.join("-")).split("-").map((place, i) => [place, pieceKeys[i]]).map(
		([place, key], i) => createCubelet(key, place)
	);

	render();

	if("serviceWorker" in navigator)
		navigator.serviceWorker.register("sw.js")
			.then(registration => {
				console.log(JSON.stringify(registration))
				console.log(`ServiceWorker ${registration.installing ? "registered" : "active"} with scope: ${registration.scope}`);
			})
			.catch(error => {
				console.log("ServiceWorker registration failed with error:", error)
			})

	$(".helpScreen").overlayScrollbars({ className: "os-theme-light" });

	setupListeners();

	function render(){
		requestAnimationFrame(render);
		Date.tick();

		updateRotations();

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.render(scene, camera);
	}

	function setupListeners(){
		let history = JSON.parse(localStorage.history || "[]");
		let historyInd = -1;


		$("canvas").click(() => $(".helpScreen").removeClass("show"))
		$(".help").click(() => $(".helpScreen").addClass("show") && false);

		$(".algorithm")
			.keydown(handler(true))
			.keyup(handler(false))
		;

		updateSuggestions();

		function handler(down){
			return function(e){
				switch(e.key){
					case "Enter":
						if(down) break;

						let val = $(this).val();

						if(!val) return;

						e.shiftKey = false;

						if(faceRotation === null && cubeRotation === null)
							displayRotationsStart = displayRotations.length;

						let reverse = turns => (e.shiftKey ? turns.reverse().map(t => {
							if(t.face) t.face.amount *= -1;
							if(t.cube) t.cube.amount *= -1;
							return t;
						}) : turns);

						let turns = interpretAlgorithm(val);

						turns.map(turn => {
							if(!turn.orig) return rotate(turn);

							if(turn.orig[0] === "~")
								return reverse(interpretAlgorithm(presetAlgorithms[turn.orig.slice(1)] || "")).map(rotate);

							if(turn.orig[0] === ":") return (commands[turn.orig.slice(1)] || (() => []))();
						});

						history.unshift(val);
						historyInd = -1;

						history.splice(25, 100)

						$(this).val("");

						localStorage.history = JSON.stringify(history);

						break;

					case "ArrowUp":
					case "ArrowDown":
						if(!down) break;

						let newInd = historyInd + (e.key === "ArrowUp" ? 1 : -1);

						if(newInd !== -1 && history[newInd] === undefined) break;

						historyInd = newInd;
						$(this).val(history[historyInd] || "");

						break;

					case "Tab":
						updateSuggestions(true);
						e.preventDefault();
				}
				updateSuggestions();
			}
		};
	}

	function updateSuggestions(complete){
		let $input = $(".algorithm");

		if($input[0].selectionStart !== $input[0].selectionEnd)
			return $(".suggestions").text("");

		let start = $input[0].selectionStart;

		let text = $(".algorithm").val();
		let word = text.slice(0, start).split(" ").reverse()[0];

		const ellipsis = "…";

		let suggestions = (() => {

			if(!word) return ["<b>:</b>", ..."~LRUDFBxyzMES".split("")];

			const groups = [":solve", ":solveWhite", ":solveYellow", ..."RUFLBD".split("").map(s => s + "w")].reverse();

			let suggestions = [
				...Object.keys(commands).map(c => ":" + c),
				...Object.keys(presetAlgorithms).map(a => "~" + a),
				...[].concat(...[..."RUFLBDxyzMES".split(""), ..."RUFLBD".split("").map(s => s + "w")].map(
					m => ["", "'", "2", "'2"].map(a => m + a)
				)),
			];

			groups.map(g => word !== g && suggestions.unshift(g + ellipsis))

			suggestions = suggestions.filter(s => !groups.filter(g =>
				s !== g + ellipsis            &&
				word.slice(0, g.length) !== g &&
				s.slice(0, g.length) === g    &&
			true).length);

			let orderGuide = [
				":solve",
				":solveWhite…",
				":solveSecondLayer",
				":solveYellow…",
			];

			suggestions.sort((a, b) => orderGuide.indexOf(a) - orderGuide.indexOf(b));


			return suggestions
				.filter(w => w.slice(0, word.length) === word)
				.map(w => "<span class='highlight'>" + word + "</span>" + w.slice(word.length))
			;

		})();

		$(".suggestions").html(suggestions.join("    "));

		if(complete && suggestions.length) {

			let newText = _.intersection(...suggestions
				.map(s => $("<span>").html(s).text())
				.map(s => s.split("").map((c, i) => c + i))
			).filter((s, i) => +s.slice(1) === i).map(s => s[0]).join("");

			if(suggestions.length === 1 && suggestions[0][suggestions[0].length - 1] === ellipsis) newText = newText.slice(0, -1);
			else if(suggestions.length === 1) newText += " ";

			$input.val([...text.slice(0, start).split(" ").slice(0, -1), newText + (start === text.length ? "" : text.slice(start))].join(" "));
			$input[0].selectionStart = $input[0].selectionEnd = start + newText.length - word.length;

		}

	}

	function updateRotations(){
		[
			{ rotation: faceRotation, rotationQueue: faceRotationQueue, rotateGroup: faceRotateGroup, groupPieces: groupPiecesFace, cube: false },
			{ rotation: cubeRotation, rotationQueue: cubeRotationQueue, rotateGroup: cubeRotateGroup, groupPieces: groupPiecesCube, cube: true  },
		].map(({ rotation, rotationQueue, rotateGroup, groupPieces, cube }) => {
			if(!rotation) return;
			if(rotation.progress >= 1) {
				if(cube) cubeRotation = null;
				else faceRotation = null;
				if(rotationQueue.length) groupPieces(rotationQueue.shift());
				updateMoves();
				return;
			}

			rotation.progress += 0.01 * Date.delta / (rotation.insta ? 1 : 4);

			let face = faces[cube ? rotation.faceKey : rotation.rotFaceKey];

			let clamped = Math.min(rotation.progress, 1);

			let eased = 3 * clamped ** 2 - 2 * clamped ** 3;

			rotateGroup.rotation["xyz"[face.axis]] =
				eased *
				rotation.amount *
				face.dir *
				-Math.tau/4 *
			1;
		})
	}

	function updateMoves(){
		let moves = displayRotations.slice(displayRotationsStart);
		let ind = (faceRotation || cubeRotation || { ind: -1 }).ind - displayRotationsStart;

		if(ind >= 0 && moves[ind] !== undefined) moves[ind] = `<span class="current">${moves[ind]}</span><span class="highlight">`;

		let slicedMoves = moves;

		if(moves[ind] !== undefined) slicedMoves = moves.slice(Math.max(0, (ind - ind % 25)), Math.min((ind - ind % 25) + 25, moves.length))

		if(moves[ind] === undefined && moves.length > 25) slicedMoves = [];

		console.log(slicedMoves);

		$(".moves").html(slicedMoves.join("    ") + (moves[ind] !== undefined ? "</span>" : ""));
	}

	function createCubelet(cubeletKey, place){
		let cubelet = new t.Group();
		cubelet.name = cubeletKey;

		cubeletKey.split("").map((f, i) => [f, place[i]]).map(([faceKey, dirKey]) => {
			let tile = createTile(faceKey, dirKey);
			place.split("").map(dirKey => {
				let face = faces[dirKey];
				tile.position["xyz"[face.axis]] = face.dir * (cubeletSize + cubeletSeperation);
			});
			let face = faces[dirKey];
			tile.position["xyz"[face.axis]] += face.dir * (cubeletSize/2 - tileThickness/2);
			cubelet.add(tile);
		});

		cube.add(cubelet);
		pieces[place.split("").sort().join("")] = cubelet;

		cubelet.userData.originalPlace = place;
		cubelet.userData.originalPiece = cubeletKey;
		cubelet.userData.key = place;
		cubelet.userData.keyHist = [];

		return cubelet;
	}

	function createTile(faceKey, dirKey){
		let face = faces[dirKey];

		let dimensions = [cubeletSize, cubeletSize, cubeletSize];
		dimensions[face.axis] = tileThickness;

		let x0 = cubeletSize/2;
		let y0 = cubeletSize/2;
		let z = tileThickness/2;
		let x1 = x0 - z * 2;
		let y1 = y0 - z * 2;

		z *= -face.dir;

		let tileFaces = [
			[+x0, -y0, -z],
			[-x0, +y0, -z],
			[-x0, -y0, -z],

			[-x0, +y0, -z],
			[+x0, -y0, -z],
			[+x0, +y0, -z],

			[+x1, +y1, +z],
			[-x0, +y0, -z],
			[+x0, +y0, -z],

			[-x0, +y0, -z],
			[+x1, +y1, +z],
			[-x1, +y1, +z],

			[+x0, -y0, -z],
			[+x1, +y1, +z],
			[+x0, +y0, -z],

			[+x1, +y1, +z],
			[+x0, -y0, -z],
			[+x1, -y1, +z],

			[+x1, +y1, +z],
			[-x1, -y1, +z],
			[-x1, +y1, +z],

			[-x1, -y1, +z],
			[+x1, +y1, +z],
			[+x1, -y1, +z],

			[-x1, -y1, +z],
			[-x0, +y0, -z],
			[-x1, +y1, +z],

			[-x0, +y0, -z],
			[-x1, -y1, +z],
			[-x0, -y0, -z],

			[-x1, -y1, +z],
			[+x0, -y0, -z],
			[-x0, -y0, -z],

			[+x0, -y0, -z],
			[-x1, -y1, +z],
			[+x1, -y1, +z],
		];

		if(z > 0) tileFaces.reverse()

		tileFaces.map(p => [...Array(face.axis + 1)].map(() => p.unshift(p.pop())));

		let geo = new t.BufferGeometry();

		geo.addAttribute("position", new t.BufferAttribute(new Float32Array([].concat(...tileFaces)), 3));

		geo.computeVertexNormals();

		let tile = new t.Mesh(geo, new t.MeshStandardMaterial({ color: faces[faceKey].color }));

		tile.position["xyz"[face.axis]] = face.dir * (cubeletSize / 2 - tileThickness / 2);

		tile.name = faceKey;

		tile.userData.key = faceKey;

		return tile;
	}

	function rotateCube({ insta, faceKey, amount, ind }){
		let rotation = { insta, faceKey, amount, progress: 0, ind };

		let updatedPieces = Object.assign({}, ...pieceKeys.map(key => {
			let val = ({ [rotatePieceKey(pieces[key].userData.key, faceKey, amount)]: pieces[key] });
			return val;
		}));

		Object.assign(pieces, updatedPieces);

		groupPiecesCube(rotation);
	}

	function groupPiecesCube(rotation){
		if(cubeRotation) return cubeRotationQueue.push(rotation);

		cubeRotation = rotation;

		cube.applyMatrix(cubeRotateGroup.matrix);
		cubeRotateGroup.rotation.set(0, 0, 0);
	}

	function rotateFace({ insta, faceKey, double, amount, ind }){
		let otherFaceKey = findFace(faces[faceKey].axis, -faces[faceKey].dir);

		let facePieceKeys = pieceKeys.filter(k => k.includes(faceKey) || (double && k.includes(otherFaceKey)));

		let rotation = {
			insta,
			faceKey,
			rotFaceKey: pieces[faceKey].userData.originalPlace,
			double,
			amount,
			pieces: facePieceKeys.map(k => pieces[k]),
			cube: false,
			progress: 0,
			ind,
		};

		let updatedPieces = Object.assign({}, ...facePieceKeys.map(key => ({ [rotatePieceKey(pieces[key].userData.key, faceKey, amount)]: pieces[key] })));

		Object.assign(pieces, updatedPieces);

		groupPiecesFace(rotation);
	}

	function groupPiecesFace(rotation){
		if(faceRotation) return faceRotationQueue.push(rotation);

		faceRotation = rotation;

		faceRotateGroup.children.concat([]).map(child => {
			child.applyMatrix(faceRotateGroup.matrix);
			faceRotateGroup.remove(child);
			cube.add(child);
		});

		faceRotateGroup.rotation.set(0, 0, 0);

		rotation.pieces.map(piece => {
			scene.remove(piece);
			faceRotateGroup.add(piece);
		});
	}

	function rotate(rot){
		displayRotations.push(stringifyRotation(rot));

		let { face = { faceKey: "u", amount: 0 }, cube = { faceKey: "u", amount: 0 }, insta } = rot;
		let ind = displayRotations.length;

		rotateFace({ ...face, insta, ind });
		rotateCube({ ...cube, insta, ind });

		updateMoves();
	}

	function interpretAlgorithm(a){
		return a.trim().split(" ").map(moveStr => {
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

	function stringifyRotation(rotation){
		if(rotation.stringified) return rotation.stringified;
		if(rotation.orig !== undefined) return "&#8212;";

		let face = rotation.face && rotation.face.amount;
		let cube = rotation.cube && rotation.cube.amount;

		if(face && !cube)
			return rotation.face.faceKey.toUpperCase() + stringifyAmount(rotation.face.amount);

		if(face && cube && rotation.face.double && rotation.cube.amount === -rotation.face.amount)
			return "MES"["rub".split("").indexOf(rotation.face.faceKey)] + stringifyAmount(rotation.face.amount);

		if(face && cube && !rotation.face.double && rotation.face.amount === rotation.cube.amount)
			return rotation.cube.faceKey.toUpperCase() + "w" + stringifyAmount(rotation.cube.amount);

		if(!face && cube)
			return "xyz"["ruf".split("").indexOf(rotation.cube.faceKey)] + stringifyAmount(rotation.cube.amount);

		if(!face && !cube) return "&#8212;";

		console.log(rotation.stringified, rotation);

		return "?";

		function stringifyAmount(amount){
			console.log(amount);
			return {
				 "1":   "",
				"-1":  "'",
				 "2":  "2",
				"-2": "-2",
			}[amount+""];
		}
	}

	function findFace(axis, dir) {
		return Object.entries(faces).filter(([key, face]) => face.dir === dir && face.axis === axis)[0][0];
	}

	function rotatePieceKey(key, faceKey, amount, modify = true){
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

	function save(){
		let cubeString = pieceKeys.map(k => findPiece(k).userData.key).join("-");
		history.pushState(null, null, `?cube=${encodeURI(cubeString)}`)
		console.log(cubeString);
	}

	function reset(){
		history.pushState(null, null, "?");
	}

	function genScramble(){
		let turns = [..."RUFLBDxyzMES".split(""), ..."RUFLBD".split("").map(s => s + "w")];
		let directions = " 2 '".split(" ");
		let scramble = [...Array(25)].map(() =>
			turns[Math.floor(Math.random() * turns.length)] +
			directions[Math.floor(Math.random() * directions.length)]
		).join(" ");
		return scramble;
	}

	function findPiece(key){
		return pieces[pieceKeys.filter(k => pieces[k].userData.originalPiece === key)[0]];
	}

	function findRotation(faceKey, key, goalKey){
		let rot = {
			faceKey,
			amount: [0, 1, -1, 2].filter(a => rotatePieceKey(key, faceKey, a, false) === goalKey)[0],
		};
		return rot;
	}

	function rotateMovesY(moves, from, to){
		let { amount } = findRotation("u", from, to);
		return moves.map(m => {
			let f = m => {
				m.faceKey = rotatePieceKey(m.faceKey, "u", amount, false);
			};
			f(m.face);
			f(m.cube);
			return m;
		});
	}

	function inMiddleLayer(key){
		return !key.includes("u") && !key.includes("d");
	}

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
					...interpretAlgorithm("Uw'"),
					{ face: { faceKey: otherFaceKey, amount: 1 } },
					...interpretAlgorithm("Uw"),
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
				let moves = interpretAlgorithm(algorithm);
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

			rotateMovesY(interpretAlgorithm(algorithm), ind ? "f" : "f", possibleFaces[0]).map(rotate);

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
				let moves = interpretAlgorithm(algorithm);
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

			rotateMovesY(interpretAlgorithm(algorithm), "f", sideFace).map(rotate);

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

		if(algorithm) rotateMovesY(interpretAlgorithm(algorithm), "f", rotatePieceKey("f", "u", -amount, false)).map(rotate);
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
			twists = twists.map(t => rotatePieceKey(t, "u", 1, false));
			if(r > 5) throw "";
		}

		let amount = [0, 1, 2, -1][r];

		if(algorithm) rotateMovesY(interpretAlgorithm(algorithm), "f", rotatePieceKey("f", "u", -amount, false)).map(rotate);
	}

	function solveYellowCorners(){
		solveYellowFace();

		let algorithm = "R' F R' B2 R F' R' B2 R2 U";

		let matchingSides = centerKeys.filter(inMiddleLayer).filter(f => {
			let findOriginal = a => {
				let { key, originalPiece } = pieces[[rotatePieceKey(f, "u", a, false), f, "u"].sort().join("")].userData;
				return originalPiece[key.indexOf(f)];
			}

			return findOriginal(1) === findOriginal(-1);
		});

		switch(matchingSides.length){
			case 0:
				let moves = interpretAlgorithm(algorithm);
				moves.map(rotate);
				moves.map(rotate);
				break;

			case 1:
				rotateMovesY(interpretAlgorithm(algorithm), "b", matchingSides[0]).map(rotate)
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
					rotateMovesY(interpretAlgorithm(algorithm), "b", matchingSides[0] || "b").map(rotate);
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
})
