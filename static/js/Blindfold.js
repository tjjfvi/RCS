
module.exports = ({
	Pieces: {
		pieceKeys,
		pieces,
	},
}) => {
	const t = three = THREE;

	let blindfoldMode = false;
	let blindfoldColor = new t.Color(0x151820);

	let tiles;

	let animation;

	return {
		toggle,
		update,
	};

	function update(){
		if(!animation) return;
		if(animation.progress > 1) return animation = null;

		animation.progress += Date.delta / 500;

		let clamped = Math.min(animation.progress, 1);

		let eased = 3 * clamped ** 2 - 2 * clamped ** 3;

		tiles.map(tile => {
			tile.material.color =
				(blindfoldMode ? tile.userData.color : blindfoldColor).clone().lerp(
					!blindfoldMode ? tile.userData.color : blindfoldColor,
					eased
				);
		})
	}

	function toggle(){
		tiles = tiles || [].concat(...pieceKeys.map(k => pieces[k].children));

		blindfoldMode = !blindfoldMode;

		animation = {
			progress: 0,
		};
	}
}
