
// sw-prod.js

let cacheName = "RCSv2";

self.addEventListener("install", event => {
	console.log("RubiksCubeSimulator ServiceWorker installing");
	event.waitUntil((async () => {
		let cache = await caches.open(cacheName);

		console.log("Opened cache", cacheName)

		await cache.addAll([]);

		console.log("Finished adding to cache")

		return true;
	})());
});

self.addEventListener("activate", event => {
	console.log("RubiksCubeSimulator ServiceWorker activated");
})

self.addEventListener("fetch", event => {
	if(event.request.method !== "GET") return;

	event.respondWith((async () => {

		const cache = await caches.open(cacheName);
		const cachedResponse = await cache.match(event.request);

		event.waitUntil(cache.add(await event.request.clone()));

		return cachedResponse || fetch(event.request);

	})());
});
