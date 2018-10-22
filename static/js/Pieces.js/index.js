
module.exports = ({ config = {} }) => {
	const cubeletSize = .628;
	const tileThickness = .05;
	const cubeletSeperation = .05;

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

	const t = three = THREE;

	return {
		faces,
		centerKeys,
		edgeKeys,
		cornerKeys,
		pieceKeys,
		pieces,
		createCubelet,
	};

	function createCubelet(cubeletKey, place){
		let cubelet = new t.Group();
		cubelet.name = cubeletKey;

		cubeletKey.split("").map((f, i) => [f, place[i]]).map(([faceKey, dirKey]) => {
			let tile = createTile(faceKey, dirKey);
			place.split("").map(dirKey => {
				let face = faces[dirKey];
				tile.position["xyz"[face.axis]] = face.dir * (cubeletSize + cubeletSeperation) * (config["2x2x2"] ? .5 : 1);
			});
			let face = faces[dirKey];
			tile.position["xyz"[face.axis]] += face.dir * (cubeletSize/2 - tileThickness/2);
			cubelet.add(tile);
		});

		pieces[place.split("").sort().join("")] = cubelet;

		if(config["2x2x2"] && cubeletKey.length !== 3)
			cubelet.visible = false;

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
		tile.userData.color = tile.material.color;

		return tile;
	}
}
