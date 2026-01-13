const CACHE_NAME = 'trash-app-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
    // 必要に応じてアイコン画像やその他のリソースを追加
    // '/icons/icon-192x192.png',
    // '/icons/icon-512x512.png'
];

// インストールイベント: キャッシュにリソースを追加
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// フェッチイベント: キャッシュからリソースを提供
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // キャッシュに見つかったらそれを返す
                if (response) {
                    return response;
                }
                // 見つからなかった場合はネットワークからフェッチ
                return fetch(event.request).then(
                    (response) => {
                        // 有効なレスポンスであればキャッシュに追加
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                );
            })
    );
});

// アクティベートイベント: 古いキャッシュを削除
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
        })
    );
});

// プッシュ通知の受信イベント
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'ゴミ出し通知', body: 'ゴミ出しの日です！' };

    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png', // 通知アイコン
        badge: data.badge || '/icons/badge.png',     // Androidでのバッジアイコン
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/', // 通知クリック時に開くURL
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 通知クリックイベント
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // 通知を閉じる

    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/') // 通知に設定されたURLを開く
    );
});

// Background Sync (例: 定期的なゴミ出しルールのチェックと通知のスケジューリング)
// この部分は、複雑なロジックのためここでは実装を省略します。
// 例:
// self.addEventListener('sync', (event) => {
//     if (event.tag === 'check-trash-schedule') {
//         event.waitUntil(syncTrashScheduleAndNotify());
//     }
// });
// function syncTrashScheduleAndNotify() {
//     // ここでLocalStorageからゴミ出しルールを読み込み、
//     // 翌日のゴミをチェックし、通知を生成するロジックを実装
//     // ただし、Service Workerから直接LocalStorageを読み込むことはできないため、
//     // PostMessageなどを使ってクライアントと通信する必要がある
//     console.log('Background sync: Checking trash schedule...');
//     return Promise.resolve(); // 実際は非同期処理
// }