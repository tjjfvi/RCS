
module.exports = ({}) => {
	let history = JSON.parse(localStorage.history || "[]");
	let historyInd = -1;

	return {
		add,
		navigate,
	};

	function add(val){
		history.unshift(val);
		historyInd = -1;

		history.splice(25, 100)

		localStorage.history = JSON.stringify(history);
	}

	function navigate(e){
		if(e.type === "keyup") return;

		let newInd = historyInd + (e.key === "ArrowUp" ? 1 : -1);

		if(newInd !== -1 && history[newInd] === undefined) return;

		historyInd = newInd;
		$(".multi").val(history[historyInd] || "");

		return;
	}
}
