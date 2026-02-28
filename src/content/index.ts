// @ts-ignore
import injectUrl from './inject.ts?script';

console.log('Ghost-Echo content script loaded');

const injectScript = () => {
    chrome.storage.local.get('isActive', (data) => {
        const active = data.isActive === true;
        console.log('[Ghost-Echo] Capture Status Check:', active ? 'ENABLED' : 'DISABLED');

        if (!active) return;
        if (document.getElementById('ghost-echo-injected')) return;

        const script = document.createElement('script');
        script.id = 'ghost-echo-injected';
        script.src = chrome.runtime.getURL(injectUrl);

        script.onload = () => {
            console.log('[Ghost-Echo] Stealth hook script loaded successfully.');
            script.remove();
        };

        script.onerror = (err) => {
            console.error('[Ghost-Echo] CRITICAL: Failed to load stealth hook script!', err);
            console.log('Target URL was:', script.src);
        };

        const target = document.head || document.documentElement;
        if (target) {
            target.appendChild(script);
            console.log('[Ghost-Echo] Attempting to inject stealth hook into Main World (v3.6)...');
        } else {
            console.error('[Ghost-Echo] No injection target found.');
        }
    });
};

const setupObserver = () => {
    const body = document.body;
    if (!body) {
        const htmlObserver = new MutationObserver(() => {
            if (document.body) {
                htmlObserver.disconnect();
                startMainObserver();
            }
        });
        htmlObserver.observe(document.documentElement, { childList: true });
    } else {
        startMainObserver();
    }
};

const startMainObserver = () => {
    console.log('[Ghost-Echo] Starting DOM observer...');
    const target = document.body;
    if (!target) return;

    const observer = new MutationObserver((mutations) => {
    });

    observer.observe(target, { childList: true, subtree: true });
};

injectScript();
setupObserver();

window.addEventListener('message', (event) => {
    if (event.data?.type === 'GHOST_ECHO_API_DATA') {
        const { url, data } = event.data;
        console.log('[Ghost-Echo] Received data from Page World:', url);

        const tweets = extractTweets(data);
        console.log(`[Ghost-Echo] Extracted ${tweets.length} tweets from response.`);

        tweets.forEach(tweet => {
            chrome.runtime.sendMessage({
                type: 'SAVE_PROCESSED_DATA',
                payload: tweet
            });
        });
    }
});

function extractTweets(obj: any): any[] {
    const tweets: any[] = [];
    const seenIds = new Set<string>();

    function search(o: any) {
        if (!o || typeof o !== 'object') return;

        if (o.__typename === 'Tweet' && o.rest_id) {
            if (!seenIds.has(o.rest_id)) {
                seenIds.add(o.rest_id);
                tweets.push(o);
            }
        }

        if (Array.isArray(o)) {
            for (const item of o) search(item);
        } else {
            for (const key in o) search(o[key]);
        }
    }

    search(obj);
    return tweets;
}


chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.isActive?.newValue === true) {
        injectScript();
    }
});
