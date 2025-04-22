'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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
    const [,setCommandOutput] = useState('');


    const allowedCommandList = [
        { key: 'status_cron', label: '📄 Trạng thái cron' },
        { key: 'list_etc', label: '📁 Liệt kê /etc' },
        { key: 'show_crontab', label: '📜 Xem nội dung crontab' },
        { key: 'syslog_tail', label: '📝 Xem log hệ thống' },
    ];

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
        fetchCrontab()
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
        if (!command) return;

        setCommandOutput(`> Đang chạy: ${command}\n⏳ Đang xử lý...\n`);

        const res = await fetch('/api/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });

        if (!res.ok) {
            setCommandOutput(prev => prev + `❌ Lỗi: ${res.status} - ${res.statusText}`);
            const error = await res.text();
            console.error('Error message from server:', error);
            return;
        }

        const data = await res.json();
        console.log("Response data:", data); // Debug để kiểm tra

        const newLog = { command, output: data.output };

        setCommandLogs(prevLogs => [...prevLogs, newLog]);

        // Cập nhật output hiển thị
        setCommandOutput(prev => prev + '\n' + data.output);
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
                    placeholder="Dán crontab vào đây..."
                />
                <Button onClick={handleImport} className="mt-2">tải vào file</Button>
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
                                <Button
                                    variant={isComment ? 'outline' : 'destructive'}
                                    size="sm"
                                    onClick={() => toggleLine(index)}
                                >
                                    {isComment ? 'Bật' : 'Tắt'}
                                </Button>
                            </td>
                        </tr>
                    )
                })}
                </tbody>
            </table>

            <div className="mt-6">
                <Button onClick={handleSave}>💾 Lưu toàn bộ crontab</Button>
            </div>
            <div className="flex gap-2 mb-2">
                <select
                    className="border px-3 py-2 rounded"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                >
                    <option value="">-- Chọn lệnh --</option>
                    {allowedCommandList.map(cmd => (
                        <option key={cmd.key} value={cmd.key}>{cmd.label}</option>
                    ))}
                </select>
                <Button onClick={handleRun} disabled={!command}>Chạy</Button>
                {commandLogs.length > 0 && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                        onClick={() => setCommandLogs([])} // click nền sẽ đóng modal
                    >
                        <div
                            className="bg-white max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl p-6 shadow-xl space-y-4 relative"
                            onClick={(e) => e.stopPropagation()} // chặn click bên trong modal làm đóng
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