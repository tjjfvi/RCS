$(() => {
	const cubeletSize = .628;
	const tileThickness = .05;
	const cubeletSeperation = .2;

	const commands = {
		t: () => interpretAlgorithm("R U R' U' R' F R2 U' R' U' R U R' F'"),
		ja: () => interpretAlgorithm("R U R' F' R U R' U' R' F R2 U' R' U'"),
		jb: () => interpretAlgorithm("y2 L' U2 L U L' U2 R U' L U R' y2"),
		y: () => interpretAlgorithm("F R U' R' U' R U R' F' R U R' U' R' F R F'"),
		ra: () => interpretAlgorithm("L U2 L' U2 L F' L' U' L U L F L2 U"),
		pause: () => interpretAlgorithm("     "),
		solve: ({ turns }) =>
			turns.map(t => {
				if(t.face) t.face.amount *= -1;
				if(t.cube) t.cube.amount *= -1;
				t.insta = true;
				return t;
			}).reverse()
		,
		scramble: () => interpretAlgorithm(genScramble().scramble().join(" ")).map(t => ({...t, insta: true})),
	};

	Math.tau = 6.283185307179586;

	Date.tick = function(){
		let now = Date.now();
		let lastTime = Date.tick.lastTime || now;
		Date.tick.lastTime = now;
		Date.delta = now - lastTime;
	}

	const moveRegex = /^(?:([FBLRUD])(w?)|([xyzXYZ])|([MES]))(['2]?)$/;

	const faces = {
		f: { color: 0xd35400, name: "Front", axis: 2, dir:  1 },
		b: { color: 0xc0392b, name:  "Back", axis: 2, dir: -1 },
		l: { color: 0x27ae60, name:  "Left", axis: 0, dir: -1 },
		r: { color: 0x2980b9, name: "Right", axis: 0, dir:  1 },
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

	const t = three = THREE;

	const scene = new t.Scene();
	const camera = new t.PerspectiveCamera(60, window.innerWidth / window.innerHeight, .1, 1000);
	const renderer = new t.WebGLRenderer({ antialias: true });

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = t.PCFShadowMap;
	renderer.setSize(window.innerWidth, window.innerHeight);
	$("body").append(renderer.domElement);

	const cube = new t.Group();
	cube.name = "Cube";

	const light = new t.DirectionalLight(0xffffff, 1);

	light.castShadow = true;
	light.shadow = new t.LightShadow(new t.PerspectiveCamera(50, 1, 10, 2500));
	light.shadow.bias = 0.0001;
	light.shadow.mapSize.width = 2048;
	light.shadow.mapSize.width = 1024;

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

	scene.add(cubeViewGroup, light, new t.AmbientLight(0xaaaaaa));

	scene.background = new t.Color(0x151820);

	camera.position.z += 5;

	pieceKeys.map(createCubelet);

	render();

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
		let history = [];
		let historyInd = -1;

		let turns = [];

		$(".algorithm").keyup(function(e){
			switch(e.key){
				case "Enter":
					let val = $(this).val();

					let newTurns = interpretAlgorithm(val);
					newTurns = [].concat(...newTurns.map(turn => turn.orig ? (
						turn.orig[0] === ":" ?
							(commands[turn.orig.slice(1)] || (() => []))(_.cloneDeep({ turns }))
						: []
					) : [turn]))

					if(e.shiftKey) newTurns.reverse().map(t => {
						if(t.face) t.face.amount *= -1;
						if(t.cube) t.cube.amount *= -1;
					});

					turns = turns.concat(newTurns);
					newTurns.map(rotate);

					history.unshift(val);
					historyInd = -1;

					$(this).val("");

					return;

				case "ArrowUp":
				case "ArrowDown":
					let newInd = historyInd + (e.key === "ArrowUp" ? 1 : -1);
					if(!history[newInd]) return;

					historyInd = newInd;
					$(this).val(history[historyInd]);
			}
		})
	}

	function updateRotations(){
		[
			{ rotation: faceRotation, rotationQueue: faceRotationQueue, rotateGroup: faceRotateGroup, rotate: rotateFace, cube: false },
			{ rotation: cubeRotation, rotationQueue: cubeRotationQueue, rotateGroup: cubeRotateGroup, rotate: rotateCube, cube: true  },
		].map(({ rotation, rotationQueue, rotateGroup, rotate, cube }) => {
			if(!rotation) return;
			if(rotation.progress >= 1) {
				if(cube) cubeRotation = null;
				else faceRotation = null;
				if(rotationQueue.length) rotate(rotationQueue.shift());
				return;
			}

			rotation.progress += 0.01 * Date.delta / (rotation.insta ? 1 : 4);

			let face = faces[cube ? rotation.faceKey : pieces[rotation.faceKey].userData.originalPiece];

			rotateGroup.rotation["xyz"[face.axis]] =
				Math.min(rotation.progress, 1) *
				rotation.amount *
				face.dir *
				-Math.tau/4 *
			1;
		})
	}

	function createCubelet(cubeletKey){
		let cubelet = new t.Group();
		cubelet.name = cubeletKey;

		cubelet.add(...cubeletKey.split("").map(createTile));
		cube.add(cubelet);
		pieces[cubeletKey] = cubelet;

		cubeletKey.split("").map(f => faces[f]).map(face =>
			cubelet.position["xyz"[face.axis]] = face.dir * (cubeletSize * .75 + cubeletSeperation)
		)

		cubelet.userData.originalPiece = cubeletKey;

		return cubelet;
	}

	function createTile(faceKey){
		let face = faces[faceKey];

		let dimensions = [cubeletSize, cubeletSize, cubeletSize];
		dimensions[face.axis] = tileThickness;

		let x0 = cubeletSize/2;
		let y0 = cubeletSize/2;
		let z = tileThickness/2;
		let x1 = x0 - z;
		let y1 = y0 - z;

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

		let tile = new t.Mesh(geo, new t.MeshStandardMaterial({ color: face.color }));

		tile.position["xyz"[face.axis]] = face.dir * (cubeletSize / 2 - tileThickness / 2);

		tile.name = faceKey;

		return tile;
	}

	function rotateCube({ insta, faceKey, amount }){
		if(cubeRotation) return cubeRotationQueue.push({ insta, faceKey, amount });

		cubeRotation = { insta, faceKey, amount, progress: 0 };

		let updatedPieces = Object.assign({}, ...pieceKeys.map(key => ({ [rotatePieceKey(key, faceKey, amount)]: pieces[key] })));

		cube.applyMatrix(cubeRotateGroup.matrix);
		cubeRotateGroup.rotation.set(0, 0, 0);

		Object.assign(pieces, updatedPieces);
	}

	function rotateFace({ insta, faceKey, double, amount }){
		if(faceRotation) return faceRotationQueue.push({ insta, faceKey, double, amount });

		faceRotation = { insta, faceKey, double, amount, progress: 0 };

		let otherFaceKey = findFace(faces[faceKey].axis, -faces[faceKey].dir);

		let facePieceKeys = pieceKeys.filter(k => k.includes(faceKey) || (double && k.includes(otherFaceKey)));

		let updatedPieces = Object.assign({}, ...facePieceKeys.map(key => ({ [rotatePieceKey(key, faceKey, amount)]: pieces[key] })));

		faceRotateGroup.children.concat([]).map(child => {
			child.applyMatrix(faceRotateGroup.matrix);
			faceRotateGroup.remove(child);
			cube.add(child);
		});

		faceRotateGroup.rotation.set(0, 0, 0);

		facePieceKeys.map(key => pieces[key]).map(piece => {
			scene.remove(piece);
			faceRotateGroup.add(piece);
		})

		Object.assign(pieces, updatedPieces);
	}

	function rotate({ face = { faceKey: "u", amount: 0 }, cube = { faceKey: "u", amount: 0 }, insta }){
		rotateFace({ ...face, insta });
		rotateCube({ ...cube, insta });
	}

	function interpretAlgorithm(a){
		return a.split(" ").map(moveStr => {
			let m = moveRegex.exec(moveStr);
			if(!m) return { orig: moveStr };

			const amount = {
				"":    1,
				"'":  -1,
				"2":   2,
			}[m[5]];

			if(m[1]) {
				let face = faces[m[1].toLowerCase()];
				return {
					face: { faceKey: findFace(face.axis, (m[2] ? -1 : 1) * face.dir), amount },
					cube: { faceKey: m[1].toLowerCase(), amount: m[2].length * amount },
				};
			}

			if(m[3]) return {
				cube: { faceKey: "ruf"["xyz".split("").indexOf(m[3].toLowerCase())], amount }
			};

			if(m[4]) {
				let faceKey = "rub"["mes".split("").indexOf(m[4].toLowerCase())];
				return {
					cube: { faceKey, amount: -amount },
					face: { faceKey, double: true, amount },
				};
			}
		});
	}

	function findFace(axis, dir) {
		return Object.entries(faces).filter(([key, face]) => face.dir === dir && face.axis === axis)[0][0];
	}

	function rotatePieceKey(key, faceKey, amount){
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
		).sort().join("");
		return rotKey;
	}
})
