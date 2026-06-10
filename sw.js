// Portfolio PWA service worker
// 策略：頁面「網路優先」→ 有網路永遠拿 GitHub Pages 最新版（不會卡舊版），
//       沒網路退回快取（離線可開）。API / 股價 / Gist 請求一律不攔截。
const CACHE = 'portfolio-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 只處理本站的頁面與靜態資源；跨域（GitHub API、Yahoo、proxy）一律放行
  if (url.origin !== self.location.origin) return;

  if (e.request.mode === 'navigate') {
    // 頁面：網路優先，成功就更新快取；失敗（離線）退回快取
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(r => r || caches.match('./index.html'))
        )
    );
    return;
  }

  // 圖示等靜態資源：快取優先（不常變）
  if (url.pathname.endsWith('.png') || url.pathname.endsWith('.json')) {
    e.respondWith(
      caches.match(e.request).then(r =>
        r || fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
      )
    );
  }
});
