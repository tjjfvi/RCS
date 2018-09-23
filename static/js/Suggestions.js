
module.exports = ({
	Commands: {
		commands,
	},
	Algorithms,
	Rotate,
}) => {

	return {
		update,
	}

	function update(complete){
		let $input = $(".multi");

		if($input[0].selectionStart !== $input[0].selectionEnd)
			return $(".suggestions").text("");

		let start = $input[0].selectionStart;

		let text = $(".multi").val();
		let word = text.slice(0, start).split(" ").reverse()[0];

		const ellipsis = "…";

		let suggestions = (() => {

			if(!word) return ["<b>:</b>", ..."~LRUDFBxyzMES".split("")];

			const groups = [":solve", ":solveWhite", ":solveYellow", ..."RUFLBD".split("").map(s => s + "w")].reverse();

			let suggestions = [
				...Object.keys(commands).map(c => ":" + c),
				...Object.keys(Algorithms.presets).map(a => "~" + a),
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

}
