(function () {
    console.log('[Ghost-Echo] --- STEALTH HOOKS STARTING (v3.6) ---');

    function wrapFetch(original: typeof fetch) {
        return async function (this: any, ...args: any[]) {
            const firstArg = args[0];
            let url = '';
            try {
                if (typeof firstArg === 'string') url = firstArg;
                else if (firstArg instanceof Request) url = firstArg.url;
                else if (firstArg instanceof URL) url = firstArg.href;
                else url = String(firstArg);
            } catch (e) { url = 'unknown'; }

            if (url && !url.startsWith('data:')) {
                console.log('[Ghost-Echo] fetch detected:', url);
            }

            const response = await (original as any).apply(this, args);

            if (url.includes('TweetDetail') || url.includes('ThreadView') || url.includes('graphql')) {
                console.log('[Ghost-Echo] TARGET FETCH CAUGHT:', url);
                const clone = response.clone();
                clone.json().then((data: any) => {
                    window.postMessage({ type: 'GHOST_ECHO_API_DATA', url, data }, '*');
                }).catch(() => { });
            }
            return response;
        };
    }

    function hookXHR() {
        const XHR = XMLHttpRequest.prototype;
        const originalOpen = XHR.open;
        const originalSend = XHR.send;

        (XHR as any).open = function (this: any, method: string, url: string) {
            this._url = url;
            return originalOpen.apply(this, arguments as any);
        };

        (XHR as any).send = function (this: any) {
            const xhr = this;
            this.addEventListener('load', function () {
                const url = (xhr as any)._url;
                if (url && (url.includes('TweetDetail') || url.includes('ThreadView') || url.includes('graphql'))) {
                    console.log('[Ghost-Echo] TARGET XHR CAUGHT:', url);
                    try {
                        const data = JSON.parse(xhr.responseText);
                        window.postMessage({ type: 'GHOST_ECHO_API_DATA', url, data }, '*');
                    } catch (e) { }
                }
            });
            return originalSend.apply(this, arguments as any);
        };
    }

    let currentFetch = window.fetch;
    window.fetch = wrapFetch(currentFetch);

    Object.defineProperty(window, 'fetch', {
        get: () => currentFetch,
        set: (v) => {
            console.log('[Ghost-Echo] Alert: Something tried to overwrite fetch. Re-applying hook.');
            currentFetch = wrapFetch(v);
        },
        configurable: true
    });

    hookXHR();
    console.log('[Ghost-Echo] --- STEALTH HOOKS ACTIVATED (v3.6) ---');
})();
