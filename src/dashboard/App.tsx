import React, { useEffect, useState } from 'react';
import { db, Reply } from '../lib/db';

function App() {
    const [replies, setReplies] = useState<Reply[]>([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const load = async () => {
            const data = await db.getAllReplies();
            setReplies(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        };
        load();
    }, []);

    const filteredReplies = replies.filter(r =>
        r.full_text.toLowerCase().includes(filter.toLowerCase()) ||
        r.user_handle.toLowerCase().includes(filter.toLowerCase())
    );

    const exportData = () => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(replies, null, 2))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = 'ghost_echo_data.json';
        link.click();
    };

    const exportCSV = () => {
        const header = ["日時", "ユーザー", "本文"];
        const rows = replies.map(r => [
            new Date(r.timestamp).toLocaleString(),
            `@${r.user_handle}`,
            `"${r.full_text.replace(/"/g, '""')}"`
        ]);
        const csvContent = "\uFEFF" + [header, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "ghost_echo_data.csv";
        link.click();
    };

    const clearData = () => {
        if (window.confirm('本当にすべての取得データを削除しますか？\nこの操作は元に戻せません。')) {
            chrome.runtime.sendMessage({ type: 'CLEAR_DATA' }, (response) => {
                if (response?.success) {
                    setReplies([]); // UIのクリア
                    alert('データをすべて削除しました。');
                } else {
                    alert('データの削除に失敗しました。');
                }
            });
        }
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Ghost-Echo Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>Total: {replies.length}</span>
                    <button onClick={exportCSV} style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}>CSVエクスポート</button>
                    <button onClick={exportData} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>JSON</button>
                    <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>更新</button>
                    <button onClick={clearData} style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}>全データクリア</button>
                </div>
            </header>

            <div style={{ marginBottom: '1rem' }}>
                <input
                    type="text"
                    placeholder="キーワードまたはユーザー名で検索..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
                />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
                        <th style={{ padding: '0.5rem' }}>日時</th>
                        <th style={{ padding: '0.5rem' }}>ユーザー</th>
                        <th style={{ padding: '0.5rem' }}>本文</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredReplies.map(reply => (
                        <tr key={reply.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{new Date(reply.timestamp).toLocaleString()}</td>
                            <td style={{ padding: '0.5rem' }}>@{reply.user_handle}</td>
                            <td style={{ padding: '0.5rem' }}>{reply.full_text.substring(0, 100)}{reply.full_text.length > 100 ? '...' : ''}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredReplies.length === 0 && <p style={{ textAlign: 'center', padding: '2rem' }}>データが見つかりません。</p>}
        </div>
    );
}

export default App;
