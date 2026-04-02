import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';


export async function GET(request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const result = await query(
            `SELECT id, role, content, action_performed, created_at
       FROM chat_history
       WHERE user_id = $1
       ORDER BY created_at ASC
       LIMIT 100`,
            [user.userId]
        );

        const messages = result.rows.map(row => ({
            id: row.id,
            role: row.role,
            parts: [{ text: row.content }],
            actionPerformed: row.action_performed,
        }));

        return NextResponse.json({ messages });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await query('DELETE FROM chat_history WHERE user_id = $1', [user.userId]);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
    }
}
