// Service Worker：只缓存静态资源，不缓存 Firebase 请求
const CACHE_NAME = 'client-system-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// 安装：缓存静态资源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.log('部分资源缓存失败（不影响使用）:', err);
            });
        })
    );
    self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(
                names.filter(name => name !== CACHE_NAME)
                     .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// 拦截请求：静态资源走缓存，其他走网络
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // 不缓存 Firebase、Google API 等动态请求
    if (url.includes('firebase') || 
        url.includes('googleapis') || 
        url.includes('gstatic')) {
        return; // 走默认网络请求
    }

    // 静态资源：缓存优先
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                // 有缓存就返回缓存，同时后台更新
                fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, response.clone());
                        });
                    }
                }).catch(() => {});
                return cached;
            }
            // 没缓存就走网络
            return fetch(event.request);
        })
    );
});