
module.exports = ({
	Pieces: {
		faces,
		pieceKeys,
		pieces,
	},
	Utils: {
		rotateKey,
		findFace,
	},
	MovePreview,
}) => {

	const t = three = THREE;

	let faceRotation = null;
	let faceRotationQueue = [];

	let cubeRotation = null;
	let cubeRotationQueue = [];

	return {
		rotate,
		update,
		updateMovePreview,
		resetMovePreview,
		changeSpeed,
	}

	function update(){
		[
			{ rotation: faceRotation, rotationQueue: faceRotationQueue, rotateGroup: t.faceRotateGroup, groupPieces: groupPiecesFace, cube: false },
			{ rotation: cubeRotation, rotationQueue: cubeRotationQueue, rotateGroup: t.cubeRotateGroup, groupPieces: groupPiecesCube, cube: true  },
		].map(({ rotation, rotationQueue, rotateGroup, groupPieces, cube }) => {
			if(!rotation) return;
			if(rotation.progress >= 1) {
				if(cube) cubeRotation = null;
				else faceRotation = null;
				if(rotationQueue.length) groupPieces(rotationQueue.shift());
				updateMovePreview();
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

	function updateMovePreview(){
		MovePreview.update({ faceRotation, cubeRotation });
	}

	function resetMovePreview(){
		MovePreview.reset({ faceRotation, cubeRotation });
	}

	function rotateCube({ insta, faceKey, amount, ind }){
		let rotation = { insta, faceKey, amount, progress: 0, ind };

		let updatedPieces = Object.assign({}, ...pieceKeys.map(key => {
			let val = ({ [rotateKey(pieces[key].userData.key, faceKey, amount, true)]: pieces[key] });
			return val;
		}));

		Object.assign(pieces, updatedPieces);

		groupPiecesCube(rotation);
	}

	function groupPiecesCube(rotation){
		if(cubeRotation) return cubeRotationQueue.push(rotation);

		cubeRotation = rotation;

		t.cube.applyMatrix(t.cubeRotateGroup.matrix);
		t.cubeRotateGroup.rotation.set(0, 0, 0);
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

		let updatedPieces = Object.assign({}, ...facePieceKeys.map(key => ({ [rotateKey(pieces[key].userData.key, faceKey, amount, true)]: pieces[key] })));

		Object.assign(pieces, updatedPieces);

		groupPiecesFace(rotation);
	}

	function groupPiecesFace(rotation){
		if(faceRotation) return faceRotationQueue.push(rotation);

		faceRotation = rotation;

		t.faceRotateGroup.children.concat([]).map(child => {
			child.applyMatrix(t.faceRotateGroup.matrix);
			t.faceRotateGroup.remove(child);
			t.cube.add(child);
		});

		t.faceRotateGroup.rotation.set(0, 0, 0);

		rotation.pieces.map(piece => {
			t.scene.remove(piece);
			t.faceRotateGroup.add(piece);
		});
	}

	function rotate(rot){
		let { face = { faceKey: "u", amount: 0 }, cube = { faceKey: "u", amount: 0 }, insta } = rot;

		MovePreview.add({ face, cube });

		rotateFace({ ...face, insta });
		rotateCube({ ...cube, insta });
	}

	function changeSpeed(insta){
		[
			faceRotation,
			...faceRotationQueue,
			cubeRotation,
			...cubeRotationQueue,
		].map(r => r && (r.insta = insta));
	}
}
