import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';


// Calculates a relevance score for a task based on current time, energy, and priority
function contextScore(task) {
    let score = 0;
    const hour = new Date().getHours();

    // Energy alignment score based on the time of day
    if (hour >= 6 && hour < 12) {
        if (task.energy === 'High') score += 20;
        else if (task.energy === 'Medium') score += 10;
    } else if (hour >= 12 && hour < 17) {
        if (task.energy === 'Medium') score += 20;
        else if (task.energy === 'Low') score += 10;
    } else {
        if (task.energy === 'Low') score += 20;
        else if (task.energy === 'Medium') score += 10;
    }

    // Deadline urgency boost for tasks due soon
    if (task.deadline) {
        const hoursLeft = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60);
        if (hoursLeft <= 24) score += 50;
        else if (hoursLeft <= 72) score += 30;
        else if (hoursLeft <= 168) score += 15;
    }

    // Base priority weighting
    score += (task.priority || 1) * 10;

    return score;
}

// Generates a human-readable reason why a specific task was recommended
function getExplanation(task) {
    const reasons = [];
    const hour = new Date().getHours();

    // Justify recommendation based on energy matching
    if (task.energy === 'High' && hour >= 6 && hour < 12)
        reasons.push('Best done in the morning when your energy is high');
    else if (task.energy === 'Low' && hour >= 17)
        reasons.push('Low-energy task suits the current evening hours');
    else if (task.energy === 'Medium')
        reasons.push('This task fits well with your current energy level');

    // Justify based on approaching deadlines
    if (task.deadline) {
        const daysLeft = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 1) reasons.push(`Deadline is TODAY – urgent!`);
        else if (daysLeft <= 3) reasons.push(`Deadline is in ${daysLeft} days – act soon`);
    }

    // High priority flag
    if (task.priority === 3) reasons.push('High priority task');

    return reasons.length > 0 ? reasons.join('. ') : 'A good task to work on right now';
}

export async function GET(request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const result = await query(
            "SELECT * FROM tasks WHERE user_id=$1 AND status='Pending' ORDER BY priority DESC",
            [user.userId]
        );
        const tasks = result.rows;

        if (tasks.length === 0) {
            return NextResponse.json({ recommendation: null, message: 'No pending tasks' }, { status: 200 });
        }

        // Score tasks and sort by contextual relevance
        const scored = tasks
            .map(t => ({ ...t, contextScore: contextScore(t) }))
            .sort((a, b) => b.contextScore - a.contextScore);

        // Attach human-readable explanations to the top 3 results
        const top3 = scored.slice(0, 3).map(t => ({
            ...t,
            explanation: getExplanation(t),
        }));

        return NextResponse.json({ recommendations: top3 }, { status: 200 });
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
