// self.addEventListener('install', (event) => {
//   event.waitUntil(
//     caches.open('static-v1').then((cache) => {
//       return fetch('asset-manifest.json').then(response => {
//         return response.json();
//       }).then(assets => {
//         // 자산 파일의 경로를 추가합니다.
//         const urlsToCache = [
//           './',
//           './index.html',
//           './manifest.json',
//           './nudge-logo.png',
//           assets.files['main.js'],
//           assets.files['main.css']
//         ];
//         return cache.addAll(urlsToCache);
//       });
//     })
//   );
// });

// self.addEventListener('fetch', (event) => {
//   event.respondWith(
//     caches.match(event.request).then((response) => {
//       return response || fetch(event.request);
//     })
//   );
// });

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('static-v2').then((cache) => {
      return fetch('asset-manifest.json').then(response => {
        return response.json();
      }).then(assets => {
        // 자산 파일의 경로를 추가합니다.
        const urlsToCache = [
          './',
          './index.html',
          './manifest.json',
          // './nudge-logo.png', // 새로운 이미지 경로로 업데이트
          './nudge_logo_192.png', // 새로운 이미지 경로로 업데이트
          './nudge_logo_512.png', // 새로운 이미지 경로로 업데이트
          assets.files['main.js'],
          assets.files['main.css']
        ];
        return cache.addAll(urlsToCache);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = ['static-v2'];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
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