self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('static-v1').then((cache) => {
      return fetch('asset-manifest.json').then(response => {
        return response.json();
      }).then(assets => {
        // 자산 파일의 경로를 추가합니다.
        const urlsToCache = [
          './',
          './index.html',
          './manifest.json',
          './icon.png',
          assets.files['main.js'],
          assets.files['main.css']
        ];
        return cache.addAll(urlsToCache);
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
