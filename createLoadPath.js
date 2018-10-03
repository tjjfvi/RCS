
Array.createRandomSortFunction = () => {
	let map = new Map([]);

	let lookup = v => {
		if(map.get(v)) return map.get(v);
		let o = Math.random();
		map.set(v, o);
		return o;
	}

	return (a, b) => lookup(a) - lookup(b);
};

Array.prototype.shuffle = function(){
	return this.sort(Array.createRandomSortFunction());
}


const { edges, svgHeader, svgFooter, classesOrder } = require("./loadPathData.js");

module.exports = () => {

	edges.shuffle();

	return genSvg();

};


function loop(begin, edgeInds){

	let gen = _(begin, begin, edgeInds, true);
	let value;
	let done = false;

	while(!done && !value)
		({ value, done } = gen.next());

	return value || { edgeInds: [], reverses: [] };


	function* _(begin, point, edgeInds, isStart){

		if(point === begin && !isStart)
			return { edgeInds: [], reverses: [] };

		yield;

		let nextEdges = edges
			.map((e, i) => [e, i])
			.filter(([_, i]) => !~edgeInds.indexOf(i))
			.filter(([e]) => e[0] === point || e[1] === point)
			.map(([e, i]) => ({ edge: e, ind: i, point: e[0] === point ? e[1] : e[0] }))
			.map(e => ({ ...e, reverse: e.edge[0] !== e.point }))
			.map(e => ({ ...e, gen: _(begin, e.point, [...edgeInds, e.ind]) }))
		;

		for(let i = 0; nextEdges.length; i++){
			i %= nextEdges.length;

			let { ind, reverse, gen } = nextEdges[i];
			let { value, done } = gen.next();

			yield value ? { edgeInds: [ind, ...value.edgeInds], reverses: [reverse, ...value.reverses] } : value;

			if(done) nextEdges.splice(i--, 1);
		}

		return;

	}

}

function fill(begin){

	let { edgeInds, reverses } = loop(begin, []);

	outer: while(true){

		let points = edgeInds.map(ei => edges[ei]).map((e, i) => e[+reverses[i]]).map((p, i) => ({ point: p, ind: i }));

		points.shuffle();

		while(points.length) {

			let { point, ind } = points[0];

			let extraEdges = edges
				.map((e, i) => [e, i])
				.filter(([e]) => e[0] === point || e[1] === point)
				.filter(([e, i]) => !~edgeInds.indexOf(i))
			;

			if(extraEdges.length) {

				let { edgeInds: newEdgeInds, reverses: newReverses } = loop(point, edgeInds);

				edgeInds.splice(ind + 1, 0, ...newEdgeInds);
				reverses.splice(ind + 1, 0, ...newReverses);

				points.shift();

				continue outer;

			}

			points.shift();

		}

		break;

	}

	return { edgeInds, reverses };

}

function genSvg(){

	let { edgeInds, reverses } = fill(edges[0][+(Math.random() > .5)]);

	let paths = edgeInds.map(ei => edges[ei]).map((e, i) => ({
		class: e.class,
		...(!reverses[i] ?
			{ 0: e[1], 1: e[0] } :
			{ 0: e[0], 1: e[1] }
		)
	})).reduceRight((acc, e) => {
		return acc[0] && acc[0].class === e.class ?
			[{ class: e.class, points: [e[0], ...acc[0].points] }, ...acc.slice(1)] :
			[{ class: e.class, points: [e[0], e[1]] }, ...acc]
	}, []).map((p, i) => ({ ...p, order: i })).sort((a, b) => classesOrder.indexOf(a.class) - classesOrder.indexOf(b.class));

	let svg = svgHeader + paths.map(p =>
		`<polyline class="${p.class}" order="${p.order}" points="${p.points.map(p => p.join(",")).join(" ")}"/>`
	).join("") + svgFooter;

	return svg;

}
