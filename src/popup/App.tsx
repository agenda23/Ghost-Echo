import React, { useEffect, useState } from 'react'

function App() {
    const [isActive, setIsActive] = useState(false);
    const [isDebugMode, setIsDebugMode] = useState(false);
    const [count, setCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 初期状態の取得
        chrome.storage.local.get(['isActive', 'isDebugMode', 'captureCount', 'lastError'], (data) => {
            setIsActive(data.isActive === true); // デフォルト false
            setIsDebugMode(data.isDebugMode === true); // デフォルト false
            setCount(data.captureCount || 0);
            setError(data.lastError || null);
        });

        // 変更を監視
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
            if (area === 'local') {
                if (changes.isActive) setIsActive(changes.isActive.newValue);
                if (changes.isDebugMode) setIsDebugMode(changes.isDebugMode.newValue);
                if (changes.captureCount) setCount(changes.captureCount.newValue);
                if (changes.lastError) setError(changes.lastError.newValue);
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    const toggleActive = () => {
        const next = !isActive;
        setIsActive(next);
        chrome.storage.local.set({ isActive: next });
    };

    const toggleDebugMode = () => {
        const next = !isDebugMode;
        setIsDebugMode(next);
        chrome.storage.local.set({ isDebugMode: next });
    };

    const openDashboard = () => {
        chrome.runtime.openOptionsPage();
    };

    const clearError = () => {
        setError(null);
        chrome.storage.local.set({ lastError: null });
    };

    return (
        <div style={{
            width: '320px',
            padding: '20px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: 'white',
            fontFamily: '"Inter", sans-serif',
            borderRadius: '12px'
        }}>
            <header style={{ marginBottom: '20px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '24px', margin: '0', background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Ghost-Echo
                </h1>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>X Reply Insights & Collector</p>
            </header>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontSize: '14px' }}>キャプチャ実行</span>
                    <button
                        onClick={toggleActive}
                        style={{
                            width: '44px',
                            height: '24px',
                            borderRadius: '12px',
                            background: isActive ? '#3b82f6' : '#475569',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s'
                        }}
                    >
                        <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: 'white',
                            position: 'absolute',
                            top: '3px',
                            left: isActive ? '23px' : '3px',
                            transition: 'left 0.2s'
                        }} />
                    </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontSize: '13px', color: '#cbd5e1' }}>デバッグモード <br /><span style={{ fontSize: '9px', color: '#94a3b8' }}>(生ログ出力)</span></span>
                    <button
                        onClick={toggleDebugMode}
                        style={{
                            width: '36px',
                            height: '20px',
                            borderRadius: '10px',
                            background: isDebugMode ? '#f59e0b' : '#334155',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s'
                        }}
                    >
                        <div style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: 'white',
                            position: 'absolute',
                            top: '3px',
                            left: isDebugMode ? '19px' : '3px',
                            transition: 'left 0.2s'
                        }} />
                    </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px' }}>取得済み件数</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa' }}>{count}</span>
                </div>
                {error && (
                    <div style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#f87171' }}>
                            <span>エラー発生</span>
                            <span onClick={clearError} style={{ cursor: 'pointer', textDecoration: 'underline' }}>消去</span>
                        </div>
                        <p style={{ fontSize: '10px', color: '#fca5a5', margin: '5px 0 0 0' }}>{error}</p>
                    </div>
                )}
            </div>

            <button
                onClick={openDashboard}
                style={{
                    width: '100%',
                    padding: '12px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                }}
            >
                ダッシュボードを開く
            </button>

            <footer style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                Ghost-Echo v0.1.0
            </footer>
        </div>
    )
}

export default App
