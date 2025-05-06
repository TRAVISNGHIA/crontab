import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Optional: chỉ cho phép một số lệnh an toàn
const WHITELIST_COMMANDS = ['docker', 'echo', 'rm', 'sh', 'crontab'];

function isValidCommand(command){
    return WHITELIST_COMMANDS.some(cmd => command.trim().startsWith(cmd));
}

export async function POST(req) {
    try {
        const body = await req.json();

        if (!Array.isArray(body.commands)) {
            return NextResponse.json({ error: 'commands phải là một mảng.' }, { status: 400 });
        }

        const results = [];

        for (const cmd of body.commands) {
            if (!isValidCommand(cmd)) {
                results.push({ command: cmd, error: 'Lệnh không nằm trong whitelist' });
                continue;
            }

            try {
                const { stdout, stderr } = await execPromise(cmd);
                results.push({ command: cmd, stdout, stderr });
            } catch (err) {
                results.push({ command: cmd, error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (err) {
        console.error('Run Command Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
