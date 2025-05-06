// api/command/route.js
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const allowedCommands = {
    'status_cron': 'systemctl status cron',
    'show_crontab': 'cat /etc/crontab',
    'cronlog_tail': 'tail /home/nghia/hello_world.log',
};

export async function POST(req) {
    try {
        const { command } = await req.json();

        if (!command || !(command in allowedCommands)) {
            return NextResponse.json({ output: 'Lệnh không được phép hoặc không tồn tại' }, { status: 400 });
        }

        const cmd = allowedCommands[command];
        const { stdout, stderr } = await execPromise(cmd);

        return NextResponse.json({ output: stdout || stderr });
    } catch (err) {
        return NextResponse.json({ output: err.message }, { status: 500 });
    }
}