// ⚠️ Substitua com os dados do SEU Firebase
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
 apiKey: "AIzaSyDUqEulxEsWVOfW5DkWK8d-rAEkn9ilsyg",
  authDomain: "lindanails.firebaseapp.com",
  projectId: "lindanails",
  storageBucket: "lindanails.firebasestorage.app",
  messagingSenderId: "4287453400",
  appId: "1:4287453400:web:d711fe4ab39aff19a09fad"
};

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(
    payload.notification?.title || "LindaNails Pro",
    {
      body:  payload.notification?.body || "Você tem um novo agendamento!",
      icon:  "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200]
    }
  );
});

/* ─── PWA CACHE ─── */
const CACHE = "lindanails-v2";
const URLS  = ["/", "/index.html", "/style.css", "/app.js", "/firebase.js",
               "/admin.html", "/admin.css", "/admin.js", "/manifest.json"];

self.addEventListener("install",  (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(URLS)).catch(() => {})); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch",    (e) => { if (e.request.method !== "GET" || e.request.url.includes("firebaseio") || e.request.url.includes("googleapis")) return; e.respondWith(caches.match(e.request).then((c) => c || fetch(e.request))); });
