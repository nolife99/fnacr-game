/*! coi-serviceworker — enable cross-origin isolation (SharedArrayBuffer / threads) on hosts
    that don't send COOP/COEP themselves (itch.io, GitHub Pages, plain static hosts).
    Based on Guido Zuidhof's coi-serviceworker (MIT). If your host CAN set the two headers
      Cross-Origin-Opener-Policy: same-origin
      Cross-Origin-Embedder-Policy: require-corp
    prefer that and you don't need this file at all. */
if (typeof window === "undefined") {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
    self.addEventListener("message", (e) => { if (e.data && e.data.type === "deregister") self.registration.unregister(); });
    self.addEventListener("fetch", function (event) {
        const r = event.request;
        if (r.cache === "only-if-cached" && r.mode !== "same-origin") return;
        event.respondWith(
            fetch(r).then((response) => {
                if (response.status === 0) return response;               // opaque, leave as-is
                const headers = new Headers(response.headers);
                headers.set("Cross-Origin-Embedder-Policy", "require-corp");
                headers.set("Cross-Origin-Opener-Policy", "same-origin");
                return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
            }).catch((e) => console.error(e))
        );
    });
} else {
    (() => {
        if (window.crossOriginIsolated !== false) return;                 // already isolated (host set headers) or unsupported
        if (!window.isSecureContext) { console.warn("coi: needs HTTPS (or localhost)"); return; }
        const src = (document.currentScript && document.currentScript.src) || "coi-serviceworker.js";
        navigator.serviceWorker && navigator.serviceWorker.register(src).then(
            (reg) => {
                reg.addEventListener("updatefound", () => window.location.reload());
                if (reg.active && !navigator.serviceWorker.controller) window.location.reload();
            },
            (err) => console.error("coi: SW registration failed", err)
        );
    })();
}
