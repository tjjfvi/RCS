
let cacheName = "RCSv0";

self.addEventListener("install", event => {
	console.log("RubiksCubeSimulator ServiceWorker installing");
	event.waitUntil(caches.open(cacheName).then(async cache => {
		console.log("Opened cache", cacheName)
		await cache.addAll([]);
		console.log("Finished adding to cache")
	}))
});

self.addEventListener("activate", event => {
	console.log("RubiksCubeSimulator ServiceWorker activated");
})

self.addEventListener("fetch", event => {
	event.respondWith(caches.match(event.request).then(async cachedResponse => {
		let fetchedResponsePromise = fetchResponse();

		return await fetchedResponsePromise.catch(async () => cachedResponse);

		async function fetchResponse(){

			let response = fetch(event.request);
			let cache = await caches.open(cacheName);

			cache.put(event.request, (await response).clone());

			return response;

		}
	}));
});
