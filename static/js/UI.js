
module.exports = ({
	Commands: {
		commands,
	},
	Suggestions,
	History,
	Algorithms,
	Rotate: {
		rotate,
		resetMovePreview,
		updateMovePreview,
	},
}) => {
	return { setupListeners };

	function setupListeners(){
		$("canvas").click(() => $(".helpScreen").removeClass("show"))
		$(".help").click(() => $(".helpScreen").addClass("show") && false);

		$(".multi")
			.keydown(handler)
			.keyup(handler)
		;

		Suggestions.update(false, { type: "keyup" });

		function handler(e){
			switch(e.key){
				case "Enter":
					if(e.type === "keydown") break;

					let val = $(this).val();

					if(!val) return;

					resetMovePreview();

					let turns = Algorithms.interpret(val);

					turns.map(turn => {
						if(!turn.orig) return rotate(turn);

						if(turn.orig[0] === "~")
							return Algorithms.interpret(Algorithms.presets[turn.orig.slice(1)] || "").map(rotate);

						if(turn.orig[0] === ":") return (commands[turn.orig.slice(1)] || (() => []))();
					});

					History.add(val);

					$(this).val("");

					updateMovePreview();

					break;

				case "ArrowUp":
				case "ArrowDown":
					History.navigate(e);
					break;

				case "Tab":
					Suggestions.update(true, e);
					e.preventDefault();
			}
			Suggestions.update(false, e);
		}
	}
}
