
$(() => {

	const dependencies = require("./preloadDependencies");

	const {

		Pieces,
		Utils,
		MovePreview,
		Rotate,
		Algorithms,
		Solve,
		Scramble,
		Blindfold,
		Commands,
		Suggestions,
		History,
		UI,

	} = new Proxy({}, {
		get: (target, key) => {
			if(target[key]) return target[key];
			return target[key] = dependencies[key](target);
		}
	})

	const queryParams = Object.assign(...location.search.slice(1).split("&").map(s =>
		({ [s.split("=")[0]]: s.split("=").slice(1).join("=") })
	));

	const t = three = THREE;

	const scene = new t.Scene();
	const camera = new t.PerspectiveCamera(60, window.innerWidth / window.innerHeight, .1, 1000);
	const renderer = new t.WebGLRenderer({ antialias: true });

	camera.position.z += 5;

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = t.PCFShadowMap;
	renderer.setSize(window.innerWidth, window.innerHeight);
	$(renderer.domElement).insertBefore(".loading");

	const cube = new t.Group();
	cube.name = "Cube";

	const lights = [
		[new t.Vector3(0,  5, -1), .75],
		[new t.Vector3(7,  0, -1), .75],
		[new t.Vector3(0,  0,  5),   2],
		[new t.Vector3(0,  0, -2), .25],
	].map(([position, intensity]) => {

		let light = new t.PointLight(0xffffff, intensity);

		light.castShadow = true;
		light.shadow = new t.LightShadow(new t.PerspectiveCamera(50, 1, 10, 2500));
		light.shadow.bias = 0.0001;
		light.shadow.mapSize.width = 2048;
		light.shadow.mapSize.width = 1024;

		light.position.copy(position);

		return light;

	});

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

	scene.add(cubeViewGroup, ...lights, new t.AmbientLight(0xffffff, 0));

	scene.background = new t.Color(0x151820);

	(queryParams.cube || Pieces.pieceKeys.join("-")).split("-").map((place, i) => [place, Pieces.pieceKeys[i]]).map(
		([place, key], i) => cube.add(Pieces.createCubelet(key, place))
	);

	UI.setupListeners();

	Object.assign(t, {
		scene,
		cube,
		faceRotateGroup,
		cubeRotateGroup,
		cubeViewGroup,
	})

	render();

	if("serviceWorker" in navigator)
		navigator.serviceWorker.register("sw.js")
			.then(registration => {
				console.log(JSON.stringify(registration))
				console.log(`ServiceWorker ${registration.installing ? "registered" : "active"} with scope: ${registration.scope}`);
			})
			.catch(error => {
				console.log("ServiceWorker registration failed with error:", error)
			})

	$(".helpScreen").overlayScrollbars({ className: "os-theme-light" });

	function render(){
		requestAnimationFrame(render);
		Date.tick();

		Rotate.update();
		Blindfold.update();

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.render(scene, camera);
	}
});
