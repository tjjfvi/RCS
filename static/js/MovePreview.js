
module.exports = () => {
	const displayRotations = [];
	let displayRotationsStart = 0;

	return {
		update,
		add,
		reset,
	}

	function update({ faceRotation, cubeRotation }){
		let moves = displayRotations.slice(displayRotationsStart);
		let ind = (faceRotation || cubeRotation || { ind: -1 }).ind - displayRotationsStart;

		if(ind >= 0 && moves[ind] !== undefined) moves[ind] = `<span class="current">${moves[ind]}</span><span class="highlight">`;

		let slicedMoves = moves;

		if(moves[ind] !== undefined) slicedMoves = moves.slice(Math.max(0, (ind - ind % 25)), Math.min((ind - ind % 25) + 25, moves.length))

		if(moves[ind] === undefined && moves.length > 25) slicedMoves = [];

		let $oldEls = $(".movePreview");
		let $newEl;
		let html = slicedMoves.join("    ") + (moves[ind] !== undefined ? "</span>" : "");

		$newEl = $("<span>")
			.addClass("movePreview")
			.html(html)
			.appendTo(".movePreviewWrapper")
		;

		setTimeout(() => {

			if(!$newEl.is(":last-child")) return;

			$newEl.addClass("show");
			$oldEls.removeClass("show");

			setTimeout(() => $oldEls.remove(), 1000);

		}, 0);
	}

	function add(rot){
		rot.face.ind = rot.cube.ind = displayRotations.push(stringifyRotation(rot)) - 1;
	}

	function reset({ faceRotation, cubeRotation }){
		if(faceRotation === null && cubeRotation === null)
			displayRotationsStart = displayRotations.length;
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

		return "?";

		function stringifyAmount(amount){
			return {
				 "1":   "",
				"-1":  "'",
				 "2":  "2",
				"-2": "-2",
			}[amount+""];
		}
	}
}
