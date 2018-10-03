(async () => {

	Promise.delay = time => new Promise(resolve => setTimeout(() => resolve(time), time));

	let script = document.currentScript;

	const globalEval = eval;

	let [
		loadSvg,
		jsFiles
	] = await Promise.all([{
		url: "loading.svg",
		mimeType: "text/plain",
	}, { url: "jsFiles.json" }].map(p => new Promise(resolve =>
		$.get({
			...p,
			success: resolve,
		})
	)));

	await new Promise($);

	let $s, length, totalLength, checks, interval;

	console.log(loadSvg);

	initLoadSvg();

	let loadeds = {};
	let totals = Object.assign(...Object.entries(jsFiles).map(([k, v]) => ({ [k]: v.size })));
	let success = {};

	let externals = $(script).attr("externals").trim().split(/,\s+/g).map(e => e.trim()).map(e => {
		let [file, size] = e.split(" ");
		totals[file] = size || 0;
		return file;
	});

	let files = Object.assign({}, ...(await externals.concat(Object.keys(jsFiles)).map(file => () => new Promise(resolve =>
		getFile(file.slice(0, 4) === "http" ? file : `js/${file}.js`, (loaded, total) => {
			loadeds[file] = loaded;
			totals[file] = total;
		}, data => {console.log(file);resolve({
			[file]: data,
		})})
	)).reduce((p, fn) => p.then(rs => fn().then(r => [...rs, r])), Promise.resolve([]))));


	const R = {};

	R.modules = {};
	R.require = (fileName) => {
		if(R.modules[fileName]) return R.modules[fileName].exports;
		return evalFile(fileName);
	};

	window.R = R;

	let startTime = Date.now();

	console.log("hi");

	externals.map(e => evalFile(e, false));

	function evalFile(fileName, module = true){
		if(module) R.modules[fileName] = { exports: {} };

		globalEval(module ?
			`((require, module) => {${files[fileName]}})(R.require, R.modules[${JSON.stringify(fileName)}]) //# sourceURL=${fileName}` :
			`${files[fileName]} //# sourceURL=${fileName}`
		);

		if(module) return R.modules[fileName].exports;
	}

	function initLoadSvg(){
		$(".loading").html(loadSvg)

		$s = [...$("svg").children(":not(style)")].map($);

		$s.sort((a, b) => a.attr("order") - b.attr("order"));

		$s.map($e => $e.css("stroke", "transparent"));

		lengths = [...$s].map($e => $e[0].getTotalLength());

		totalLength = lengths.reduce((a, b) => a + b, 0);

		checks = [...Array($s.length)].map(() => false);

		let currentProgress = 0;

		interval = setInterval(() => {
			let loaded = Object.values(loadeds).reduce((a, b) => a + b, 0);
			let total = Object.values(totals).reduce((a, b) => a + b, 0);
			let progress = loaded / total;

			currentProgress = currentProgress * .9 + progress * .1;

			if(1 - currentProgress < 0.0001) currentProgress = 1;

			updateProgress(currentProgress);

			if(currentProgress === 1) {
				evalFile("index");
				$(".loading").addClass("fade");
				setTimeout(() => $(".loading").remove(), 600);
			}
		}, 10)
	}

	function updateProgress(progress){
		if(progress === 1) {
			progress -= Number.EPSILON;
			clearInterval(interval);
		}

		let lengthProgress = progress * totalLength;

		let [length, ind] = lengths
			.map((l, i) => [l, i])
			.filter(([l, i], _, a) => (
				a.slice(0, i)
					.map(([l]) => l)
					.reduce((a, b) => a + b, 0)
				+ l
			) > lengthProgress)
		[0];

		let $el = $s[ind];

		checks.slice(0, ind).map((c, i) => [c, i]).filter(([c, i]) => !c).map(([_, i]) => {
			let $oldEl = $s[i];
			checks[i] = true;
			$oldEl.css($oldEl.hasClass("ghost") ? { stroke: "transparent" } : { stroke: "", "stroke-dasharray": "" })
		});

		let adjustedLengthProgress = lengthProgress - lengths.slice(0, ind).reduce((a, b) => a + b, 0);

		$el.css({
			stroke: "",
			"stroke-dasharray": $el.hasClass("ghost") ? `0, ${adjustedLengthProgress}, 10, ${length}` : `${adjustedLengthProgress} ${length}`
		})

		return true;
	}

	function getFile(url, onProgress, success){
		$.ajax({
		    xhr: () => {
		        let xhr = new XMLHttpRequest();

		       xhr.addEventListener("progress", (evt) => {
		           if(!evt.lengthComputable) return;

				   onProgress(evt.loaded, evt.total);

		       }, false);

		       return xhr;
		    },
		    type: 'GET',
		    url,
		    success,
			mimeType: "text/plain",
		});
	}

})();
