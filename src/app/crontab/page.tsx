'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

interface LineItem {
    line: string
    index: number
}

export default function CrontabEditor() {
    const [lines, setLines] = useState<string[]>([])
    const [search, setSearch] = useState('')
    const textAreaRefs = useRef<(HTMLTextAreaElement | null)[]>([])
    const [importText, setImportText] = useState('');
    const [command, setCommand] = useState('');
    const [ commandLogs, setCommandLogs ] = useState<{ command: string, output: string }[]>([]);

    useEffect(() => {
        const fetchCrontab = async () => {
            try {
                const res = await fetch('/api/crontab')
                const data = await res.json()
                setLines(data.content.split('\n'))
            } catch (err) {
                console.error('Lỗi khi tải crontab:', err)
            }
        }
        fetchCrontab();
    }, [])

    const toggleLine = (index: number) => {
        const updated = [...lines]
        const currentLine = updated[index]
        updated[index] = currentLine.trim().startsWith('#')
            ? currentLine.replace(/^#\s?/, '')
            : `# ${currentLine}`
        setLines(updated)
    }

    const handleSave = async () => {
        try {
            const res = await fetch('/api/crontab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: lines.join('\n') })
            })

            if (!res.ok) throw new Error('Lỗi khi lưu')

            alert('✅ Đã lưu thay đổi!')
        } catch (err) {
            console.error(err)
            alert('❌ Lỗi khi lưu crontab!')
        }
    }

    const filtered: LineItem[] = lines
        .map((line, idx) => ({ line, index: idx }))
        .filter(({ line }) =>
            line.toLowerCase().includes(search.toLowerCase())
        )

    const handleLineChange = (value: string, index: number) => {
        const updated = [...lines]
        if (value.trim() === '') {
            updated.splice(index, 1)
            textAreaRefs.current.splice(index, 1)
        } else {
            updated[index] = value
        }
        setLines(updated)
    }

    const autoResize = (el: HTMLTextAreaElement | null) => {
        if (el) {
            el.style.height = 'auto'
            el.style.height = el.scrollHeight + 'px'
        }
    }
    const handleImport = () => {
        const importedLines = importText.split('\n').map(line => line.trimEnd())

        const updatedLines = [...lines, ...importedLines]

        setLines(updatedLines)
    }
    const handleRun = async () => {
        if (!command.trim()) return;

        setCommandLogs(prev => [...prev, { command, output: '⏳ Đang xử lý...' }]);

        try {
            const res = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: command.trim() })
            });

            const data = await res.json();

            setCommandLogs(prev => [
                ...prev.slice(0, -1),
                { command, output: data.output || data.error || '❌ Không có output' },
            ]);

            setCommand('');
        } catch (err) {
            console.error('❌ Lỗi khi gọi API:', err);
            setCommandLogs(prev => [
                ...prev.slice(0, -1),
                { command, output: '❌ Lỗi kết nối server' },
            ]);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="mb-6">
                <label className="font-semibold mb-1 block">crontab:</label>
                <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={5}
                    className="w-full border p-2 font-mono text-sm rounded"
                    placeholder="Dán tệp crontab vào đây để phân chia dòng sao cho hợp lý "
                />
                <Button onClick={handleImport} className="mt-2">dán tệp vào file bên dưới</Button>
            </div>

            <Input
                placeholder="🔍 Tìm kiếm dòng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-4"
            />

            <table className="w-full border text-sm">
                <thead>
                <tr className="bg-gray-100 text-left">
                    <th className="p-2 w-12">#</th>
                    <th className="p-2">Nội dung</th>
                    <th className="p-2 w-32">Trạng thái</th>
                    <th className="p-2 w-32">Hành động</th>
                </tr>
                </thead>
                <tbody>
                {filtered.map(({ line, index }) => {
                    const isComment = line.trim().startsWith('#')

                    return (
                        <tr
                            key={index}
                            className={cn('border-t', isComment && 'bg-yellow-50 text-gray-500')}
                        >
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2">
                                <textarea
                                    ref={(el) => {
                                        textAreaRefs.current[index] = el
                                        autoResize(el)
                                    }}
                                    value={line}
                                    onChange={(e) => {
                                        handleLineChange(e.target.value, index)
                                        autoResize(e.target)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            const updated = [...lines]
                                            updated.splice(index + 1, 0, '')
                                            setLines(updated)
                                            setTimeout(() => {
                                                textAreaRefs.current[index + 1]?.focus()
                                            }, 0)
                                        } else if (e.key === 'ArrowDown') {
                                            e.preventDefault()
                                            textAreaRefs.current[index + 1]?.focus()
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault()
                                            textAreaRefs.current[index - 1]?.focus()
                                        }
                                    }}
                                    rows={1}
                                    className="w-full font-mono text-sm border px-1 py-0.5 rounded resize-none overflow-hidden"
                                />
                            </td>
                            <td className="p-2">
                                {isComment ? 'Đang tắt' : 'Đang bật'}
                            </td>
                            <td className="p-2">
                                <Switch
                                    checked={!isComment}
                                    onCheckedChange={() => toggleLine(index)}
                                />
                            </td>
                        </tr>
                    )
                })}
                </tbody>
            </table>

            <div className="mt-6">
                <Button onClick={handleSave}>💾 Lưu toàn bộ crontab</Button>
            </div>
            <div className="flex flex-col gap-2 mb-6">
                <textarea
                    className="w-full p-2 border rounded font-mono text-sm"
                    rows={3}
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Nhập lệnh shell được phép chạy ( status_cron, show_crontab, cronlog_tail)"
                />
                <Button onClick={handleRun} disabled={!command.trim()}>
                    🚀 Chạy lệnh
                </Button>

                {commandLogs.length > 0 && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                        onClick={() => setCommandLogs([])}
                    >
                        <div
                            className="bg-white max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl p-6 shadow-xl space-y-4 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {commandLogs.map((log, idx) => (
                                <div key={idx} className="bg-gray-100 p-3 rounded text-sm shadow-sm border">
                                    <div className="text-gray-600 font-semibold mb-1">
                                        ▶️ Lệnh: <code className="bg-white px-1 py-0.5 rounded">{log.command}</code>
                                    </div>
                                    <pre className="whitespace-pre-wrap text-gray-800">{log.output}</pre>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
