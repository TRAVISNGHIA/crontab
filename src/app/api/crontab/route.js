import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { isValidCron } from 'cron-validator';

const CRONTAB_PATH = '/etc/crontab';

export async function GET() {
    try {
        const content = await fs.readFile(CRONTAB_PATH, 'utf-8');
        return NextResponse.json({ content });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { content } = await req.json();

        const lines = content.split('\n');
        const errors = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();

            if (trimmed === '' || trimmed.startsWith('#')) return;

            const check = isValidEtcCrontabLine(trimmed);
            if (!check.valid) {
                errors.push({
                    lineNumber: index + 1,
                    line: trimmed,
                    error: check.error
                });
            }
        });

        if (errors.length > 0) {
            return NextResponse.json(
                { message: 'Crontab contains invalid lines', errors },
                { status: 400 }
            );
        }

        await fs.writeFile(CRONTAB_PATH, content, 'utf-8');
        return NextResponse.json({ message: 'Crontab updated successfully' });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function isValidEtcCrontabLine(line) {
    const parts = line.trim().split(/\s+/);

    if (parts.length < 5) {
        return { valid: false, error: 'Dòng crontab thiếu trường thời gian (cần 5).' };
    }

    const cronTime = parts.slice(0, 5).join(' ');

    if (!isValidCron(cronTime)) {
        return { valid: false, error: 'Biểu thức thời gian không hợp lệ.' };
    }

    return { valid: true };
}
