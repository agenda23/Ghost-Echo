import { db, Reply } from '../lib/db';

console.log('Ghost-Echo background script initialized');

// バッジの更新関数
async function updateBadge(count: number) {
    if (count > 0) {
        await chrome.action.setBadgeText({ text: count.toString() });
        await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // 赤色
    } else {
        await chrome.action.setBadgeText({ text: '' }); // 0の時は非表示
    }
}

// アイコンの色を動的に変更する関数
function setIconColor(isActive: boolean) {
    // Service Worker 内で OffscreenCanvas を使用
    const canvas = new OffscreenCanvas(16, 16);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 背景（角丸または円）
    ctx.fillStyle = isActive ? '#3b82f6' : '#94a3b8'; // アクティブなら青、非アクティブならグレー
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, 2 * Math.PI);
    ctx.fill();

    // 白抜きの「G」の文字（任意）
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('G', 8, 8.5);

    const imageData = ctx.getImageData(0, 0, 16, 16);
    chrome.action.setIcon({ imageData: { '16': imageData } });
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('Ghost-Echo extension installed');
    chrome.storage.local.set({ isActive: false, captureCount: 0 });
    updateBadge(0);
    setIconColor(false);
});

// Storage の変更を監視してバッジ・アイコンを同期
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.captureCount) {
            updateBadge(changes.captureCount.newValue);
        }
        if (changes.isActive) {
            setIconColor(changes.isActive.newValue === true);
        }
    }
});

// メッセージ受信リスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Ghost-Echo] Background message received:', message.type);
    if (message.type === 'SAVE_PROCESSED_DATA') {
        console.log('[Ghost-Echo] Processing save request for tweet:', message.payload?.rest_id);
        saveTweet(message.payload).then(() => {
            sendResponse({ success: true });
        });
        return true;
    } else if (message.type === 'CLEAR_DATA') {
        (async () => {
            try {
                await db.clearAllReplies();
                await chrome.storage.local.set({ captureCount: 0 });
                console.log('[Ghost-Echo] All data cleared successfully.');
                sendResponse({ success: true });
            } catch (error) {
                console.error('[Ghost-Echo] Failed to clear data:', error);
                sendResponse({ success: false, error });
            }
        })();
        return true; // 非同期レスポンスを示す
    }
    return true;
});

async function saveTweet(content: any) {
    try {
        const storageOptions = await chrome.storage.local.get('isDebugMode');
        if (storageOptions.isDebugMode) {
            console.log('[Ghost-Echo] RAW DATA EVENT CAUGHT:', content);
        }

        if (content && content.__typename === 'Tweet') {
            const tweet = content.legacy;

            // ユーザー情報の構造は複数パターンあるためフォールバックを含めて取得
            const userResult = content.core?.user_results?.result;

            const userHandle =
                userResult?.core?.screen_name ||        // 最新のGraphQL構造(提供いただいたデータ)
                userResult?.legacy?.screen_name ||      // 従来の構造
                userResult?.rest_id ||                  // IDへのフォールバック
                tweet?.screen_name ||                   // 古い直接のプロパティ
                'unknown_user';

            if (tweet) {
                const reply: Reply = {
                    id: content.rest_id,
                    conversation_id: tweet.conversation_id_str,
                    user_handle: userHandle,
                    full_text: tweet.full_text,
                    reply_count: tweet.reply_count,
                    favorite_count: tweet.favorite_count,
                    timestamp: tweet.created_at ? new Date(tweet.created_at).toISOString() : new Date().toISOString()
                };

                await db.saveReply(reply);
                console.log('[Ghost-Echo] Saved reply:', reply.id, 'Handle:', userHandle);

                // 実データの件数を取得して storage の captureCount を更新
                // これによりダッシュボードの表示件数と拡張機能バッジが完全に同期する
                const allReplies = await db.getAllReplies();
                await chrome.storage.local.set({ captureCount: allReplies.length });
            }
        }

    } catch (err: any) {
        console.error('[Ghost-Echo] Failed to save visibility-confirmed tweet:', err);
        await chrome.storage.local.set({ lastError: err.message || String(err) });
    }
}
