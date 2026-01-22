// バージョンを更新して、ブラウザに新しいSWだと認識させる
const CACHE_NAME = 'trash-app-cache-v3-dev'; 

const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// インストールイベント: 基本ファイルのみキャッシュ（オフライン用）
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    // 待機状態をスキップして即座にアクティブにする
    self.skipWaiting();
});

// アクティベートイベント: 古いキャッシュを即削除
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // クライアント（開いているページ）を即座に制御下に置く
            return self.clients.claim();
        })
    );
});

// フェッチイベント: 戦略を「Network First」に変更
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // 1. 画像やフォントファイルは「Cache First（キャッシュ優先）」
    //    （変更頻度が低く、重いため）
    if (request.destination === 'image' || request.destination === 'font' || url.pathname.match(/\.(png|jpg|jpeg|svg|gif)$/)) {
        event.respondWith(
            caches.match(request).then((response) => {
                // キャッシュにあればそれを返す、なければネットワークへ
                return response || fetch(request).then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // 2. HTML, CSS, JS などは「Network First（ネットワーク優先）」
    //    （開発中の変更を即座に反映させるため）
    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                // ネットワークから正常に取得できた場合
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // 次回オフライン時のために、最新版をキャッシュに保存しておく
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });

                return networkResponse;
            })
            .catch(() => {
                // ネットワークエラー（オフライン）の時はキャッシュを使用
                console.log('Network failed, falling back to cache');
                return caches.match(request);
            })
    );
});

// プッシュ通知の受信イベント（変更なし）
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'ゴミ出し通知', body: 'ゴミ出しの日です！' };
    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/badge.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/', dateOfArrival: Date.now(), primaryKey: 1 }
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
});

// 通知クリックイベント（変更なし）
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});