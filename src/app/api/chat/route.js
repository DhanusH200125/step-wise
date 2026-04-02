'use server';
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/utils/auth";

// Definitions for AI-callable functions (tools) that the LLM can trigger
const tools = [
    {
        type: "function",
        function: {
            name: "bulk_create_tasks",
            description: "Creates multiple tasks at once. Use this when the user asks to create more than 2 tasks.",
            parameters: {
                type: "object",
                properties: {
                    tasks: {
                        type: "array",
                        description: "Array of tasks to create",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                domain: { type: "string", description: "Work/Study, Personal Growth, Health, Life Admin" },
                                duration: { type: "number", description: "Minutes" },
                                priority: { type: "number", description: "1 Low, 2 Medium, 3 High" },
                                deadline: { type: "string", description: "ISO date string, optional" },
                                energy: { type: "string", description: "low, medium, high" },
                                flexibility: { type: "string", description: "hard or soft" },
                            },
                            required: ["title", "domain", "duration"],
                        },
                    },
                },
                required: ["tasks"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "create_task",
            description: "Creates a single new task for the user.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Task title" },
                    domain: { type: "string", description: "One of: Work/Study, Personal Growth, Health, Life Admin" },
                    priority: { type: "number", description: "1 = Low, 2 = Medium, 3 = High" },
                    deadline: { type: "string", description: "ISO date string, optional" },
                    duration: { type: "number", description: "Duration in minutes" },
                    energy: { type: "string", description: "low, medium, or high" },
                    flexibility: { type: "string", description: "hard or soft" },
                },
                required: ["title", "domain", "duration"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "update_task",
            description: "Updates an existing task. Use status='Completed' to mark done.",
            parameters: {
                type: "object",
                properties: {
                    id: { type: "number", description: "Task ID to update" },
                    title: { type: "string" },
                    status: { type: "string", description: "Pending, Completed, Cancelled" },
                    priority: { type: "number" },
                    deadline: { type: "string" },
                    duration: { type: "number" },
                },
                required: ["id"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "delete_task",
            description: "Permanently deletes a task by ID.",
            parameters: {
                type: "object",
                properties: {
                    id: { type: "number", description: "Task ID to delete" },
                },
                required: ["id"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_productivity_reports",
            description: "Fetches the user's productivity stats, completion rate, and domain breakdown.",
            parameters: { type: "object", properties: {}, required: [] },
        },
    },
    {
        type: "function",
        function: {
            name: "get_weekly_plan",
            description: "Fetches the user's current weekly scheduled plan including task slots, domains, and times.",
            parameters: {
                type: "object",
                properties: {
                    week_start: { type: "string", description: "ISO date of Monday. Leave empty for current week." },
                },
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "generate_weekly_plan",
            description: "Generates or regenerates the AI weekly plan for the user. Call when user asks to plan their week or reschedule.",
            parameters: { type: "object", properties: {}, required: [] },
        },
    },
    {
        type: "function",
        function: {
            name: "get_now_recommendations",
            description: "Fetches the top recommended tasks to work on right now based on energy, priority, and deadlines.",
            parameters: { type: "object", properties: {}, required: [] },
        },
    },
    {
        type: "function",
        function: {
            name: "get_weekly_report",
            description: "Fetches the AI-generated weekly report with insights, suggestions, domain breakdown, and completion rate.",
            parameters: {
                type: "object",
                properties: {
                    week_start: { type: "string", description: "ISO date of Monday. Leave empty for current week." },
                },
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_analytics",
            description: "Fetches detailed analytics: daily completions, planned vs actual hours, productivity heatmap, growth trend.",
            parameters: { type: "object", properties: {}, required: [] },
        },
    },
    {
        type: "function",
        function: {
            name: "get_routines",
            description: "Fetches all the user's routines including title, day of week, start time, end time.",
            parameters: { type: "object", properties: {}, required: [] },
        },
    },
    {
        type: "function",
        function: {
            name: "create_routine",
            description: "Creates a new recurring routine block for the user.",
            parameters: {
                type: "object",
                properties: {
                    label: { type: "string", description: "Routine name e.g. Morning Workout" },
                    dayofweek: { type: "number", description: "0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday" },
                    starttime: { type: "string", description: "Start time in HH:MM format e.g. 07:00" },
                    endtime: { type: "string", description: "End time in HH:MM format e.g. 08:00" },
                    category: { type: "string", description: "work, health, personal, study, or other" },
                },
                required: ["label", "dayofweek", "starttime", "endtime"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "update_routine",
            description: "Updates an existing routine by ID.",
            parameters: {
                type: "object",
                properties: {
                    id: { type: "number", description: "Routine ID to update" },
                    label: { type: "string" },
                    dayofweek: { type: "number" },
                    starttime: { type: "string", description: "HH:MM format" },
                    endtime: { type: "string", description: "HH:MM format" },
                    category: { type: "string" },
                },
                required: ["id", "label", "dayofweek", "starttime", "endtime"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "delete_routine",
            description: "Permanently deletes a routine by ID.",
            parameters: {
                type: "object",
                properties: {
                    id: { type: "number", description: "Routine ID to delete" },
                },
                required: ["id"],
            },
        },
    },
];

// Implementation of the functions that handle specific AI tool requests
const functions = {

    bulk_create_tasks: async ({ tasks }, userId) => {
        const results = [];
        // Iterate through requested tasks and insert them into the database
        for (const task of tasks) {
            try {
                await query(
                    `INSERT INTO tasks (user_id, title, domain, priority, deadline, duration, energy, flexibility, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
                    [
                        userId,
                        task.title,
                        task.domain,
                        task.priority ?? 2,
                        task.deadline ? `${task.deadline.split('T')[0]}T00:00:00+05:30` : null,
                        task.duration,
                        (task.energy ?? 'medium').toLowerCase(),
                        (task.flexibility ?? 'soft').toLowerCase(),
                    ]
                );
                results.push({ title: task.title, status: 'created' });
            } catch (e) {
                results.push({ title: task.title, status: 'failed', error: e.message });
            }
        }
        const created = results.filter(r => r.status === 'created').length;
        return { success: true, message: `${created}/${tasks.length} tasks created.`, results };
    },

    create_task: async (args, userId) => {
        try {
            const { title, domain, priority, deadline, duration, energy, flexibility } = args;
            await query(
                `INSERT INTO tasks (user_id, title, domain, priority, deadline, duration, energy, flexibility, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    userId, title, domain,
                    priority || 2,
                    deadline ? `${deadline.split('T')[0]}T00:00:00+05:30` : null,
                    duration,
                    (energy || 'medium').toLowerCase(),
                    (flexibility || 'soft').toLowerCase(),
                    'pending',
                ]
            );
            return { success: true, message: `Task "${title}" created.` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    update_task: async (args, userId) => {
        try {
            const { id, ...updates } = args;

            // Automatically set completion timestamp if status is updated to 'completed'
            if (updates.status?.toLowerCase() === 'completed') {
                updates.completed_at = new Date().toISOString();
            }

            const keys = Object.keys(updates);
            if (keys.length === 0) return { success: false, error: "No update fields provided." };
            const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
            const res = await query(
                `UPDATE tasks SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2} RETURNING title`,
                [...Object.values(updates), id, userId]
            );
            if (res.rowCount === 0) return { success: false, error: "Task not found." };
            return { success: true, message: `Task "${res.rows[0].title}" updated successfully.` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    delete_task: async (args, userId) => {
        try {
            const res = await query(
                "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING title",
                [args.id, userId]
            );
            if (res.rowCount === 0) return { success: false, error: "Task not found." };
            return { success: true, message: `Task "${res.rows[0].title}" deleted.` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    get_productivity_reports: async (args, userId) => {
        try {
            const stats = (await query(
                `SELECT
                   COUNT(*) FILTER (WHERE LOWER(status) = 'completed') AS completed,
                   COUNT(*) FILTER (WHERE LOWER(status) = 'pending')   AS pending,
                   COUNT(*) AS total
                 FROM tasks WHERE user_id = $1`,
                [userId]
            )).rows[0];
            const domainResult = await query(
                `SELECT domain, COUNT(*) AS count FROM tasks WHERE user_id = $1 GROUP BY domain`,
                [userId]
            );
            return {
                summary: {
                    total_tasks: stats.total,
                    completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
                    completed: stats.completed,
                    pending: stats.pending,
                },
                domainBreakdown: domainResult.rows,
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    get_weekly_plan: async (args, userId, req) => {
        try {
            const qs = args.week_start ? `?weekstart=${args.week_start}` : '';
            const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const res = await fetch(`${base}/api/planner${qs}`, {
                headers: { cookie: req.headers.get('cookie') ?? '' },
            });
            const json = await res.json();
            return json.data ?? json;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    generate_weekly_plan: async (args, userId, req) => {
        try {
            const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const res = await fetch(`${base}/api/planner/generate`, {
                method: 'POST',
                headers: {
                    cookie: req.headers.get('cookie') ?? '',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });
            const json = await res.json();
            return json;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    get_now_recommendations: async (args, userId, req) => {
        try {
            const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const res = await fetch(`${base}/api/now`, {
                headers: { cookie: req.headers.get('cookie') ?? '' },
            });
            const json = await res.json();
            return json.data ?? json;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    get_weekly_report: async (args, userId, req) => {
        try {
            const qs = args.week_start ? `?weekstart=${args.week_start}` : '';
            const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const res = await fetch(`${base}/api/reports${qs}`, {
                headers: { cookie: req.headers.get('cookie') ?? '' },
            });
            const json = await res.json();
            return json.data ?? json;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    get_analytics: async (args, userId, req) => {
        try {
            const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const res = await fetch(`${base}/api/analytics/dashboard`, {
                headers: { cookie: req.headers.get('cookie') ?? '' },
            });
            const json = await res.json();
            return json.data ?? json;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    get_routines: async (args, userId) => {
        try {
            const res = await query(
                `SELECT id, title AS label, type AS category, day_of_week, start_time, end_time
             FROM routines WHERE user_id = $1 ORDER BY day_of_week, start_time`,
                [userId]
            );
            return { success: true, routines: res.rows };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    create_routine: async (args, userId) => {
        try {
            const { label, dayofweek, starttime, endtime, category = 'other' } = args;
            const res = await query(
                `INSERT INTO routines (user_id, title, type, day_of_week, start_time, end_time, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, title AS label`,
                [userId, label.trim(), category, dayofweek, starttime.slice(0, 5), endtime.slice(0, 5)]
            );
            return { success: true, message: `Routine "${label}" created.`, routine: res.rows[0] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    update_routine: async (args, userId) => {
        try {
            const { id, label, dayofweek, starttime, endtime, category = 'other' } = args;
            const res = await query(
                `UPDATE routines SET title=$1, type=$2, day_of_week=$3, start_time=$4, end_time=$5, updated_at=NOW()
             WHERE id=$6 AND user_id=$7 RETURNING title AS label`,
                [label.trim(), category, dayofweek, starttime.slice(0, 5), endtime.slice(0, 5), id, userId]
            );
            if (res.rowCount === 0) return { success: false, error: "Routine not found." };
            return { success: true, message: `Routine "${res.rows[0].label}" updated.` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    delete_routine: async (args, userId) => {
        try {
            const res = await query(
                `DELETE FROM routines WHERE id=$1 AND user_id=$2 RETURNING title AS label`,
                [args.id, userId]
            );
            if (res.rowCount === 0) return { success: false, error: "Routine not found." };
            return { success: true, message: `Routine "${res.rows[0].label}" deleted.` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
};

// Main POST handler for processing user chat messages and AI tool execution
export async function POST(req) {
    try {
        const user = await getUserFromRequest(req);
        const userId = user?.userId || user?.id;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { message, history } = await req.json();
        if (!process.env.OPENROUTER_API_KEY)
            return NextResponse.json({ error: "OpenRouter API Key missing" }, { status: 500 });

        // Fetch current user tasks and routines to provide context to the LLM
        const tasksRes = await query(
            `SELECT id, title, status, priority, domain, deadline, duration, energy, flexibility
             FROM tasks WHERE user_id = $1 AND LOWER(status) != 'completed'
             ORDER BY priority DESC LIMIT 20`,
            [userId]
        );
        const routinesRes = await query(
            `SELECT id, title, start_time, end_time, day_of_week FROM routines WHERE user_id = $1 LIMIT 10`,
            [userId]
        );

        const now = new Date();
        // Construct a serialized context string for the AI model
        const contextString = `
Current Time: ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}
User Name: ${user.name}
Active Tasks (${tasksRes.rows.length}): ${JSON.stringify(tasksRes.rows)}
Routines: ${JSON.stringify(routinesRes.rows)}
        `.trim();

        const messages = [
            // Define the AI persona, guidelines, and available context
            {
                role: 'system',
                content: `You are Stepwise AI — a warm, sharp productivity coach built into the Stepwise app. You know the user's tasks, routines, and schedule.

PERSONALITY
- Talk like a smart friend who knows productivity, not a corporate assistant
- Be direct and warm. Skip intros like "Based on your data..." or "Since I only have access to..."
- Never say what you *can't* do — just do what you *can* and make it useful
- If data is missing, work with what you have and offer to help fill the gap
- Use "you" naturally. Keep it conversational.

TOOL RULES
- When user asks to create 2+ tasks, ALWAYS use bulk_create_tasks — never call create_task in a loop
- When user asks to plan their week, call generate_weekly_plan
- When user asks what to do now or what to work on, call get_now_recommendations
- When user asks for a report or weekly summary, call get_weekly_report
- When user asks for charts, trends, or analytics, call get_analytics
- When user asks to see/list routines, call get_routines
- When user asks to add/create a routine, call create_routine
- When user asks to update/edit a routine, call update_routine
- When user asks to delete/remove a routine, call delete_routine

RESPONSE RULES
- Max 150 words for casual replies, no limit for reports/analysis
- Use markdown tables for structured data comparisons
- Use bullet points sparingly — only when listing 3+ distinct items
- Never start a response with "I", "Sure", "Of course", "Based on", "Since", or "However"
- For date questions with no matching tasks → just say it's clear and offer to add something
- When displaying a weekly plan, ALWAYS format it as a markdown table with columns: Day, Focus, Suggested Blocks
- Never output raw XML or function call tags in your response text

FORMATTING RULES
- NEVER use HTML tags like <br>, <strong>, <table>, <div> in responses
- ALWAYS use markdown: **bold**, *italic*, newlines for breaks
- Use | markdown tables | for structured data
- Use a blank line between paragraphs
- For line breaks use newline characters, never <br>

CHARTS
- Only emit charts when user asks for visual data or a report
- Emit a fenced \`\`\`chart block with valid JSON: { "type": "bar"|"line"|"pie", "title": "...", "data": [{ "name": "...", "value": 123 }], "xKey": "name", "yKey": "value" }
- Never use Chart.js format (no "datasets", no "labels" keys)

CONTEXT
${contextString}`,
            },
            ...history,
            { role: 'user', content: message },
        ];

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "nvidia/nemotron-3-super-120b-a12b:free",
                messages,
                tools,
                tool_choice: "auto",
            }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "OpenRouter Error");

        let aiMessage = data.choices[0].message; // Extract the primary model response
        let actionWasPerformed = false;

        if (aiMessage.tool_calls) {
            actionWasPerformed = true;
            const toolMessages = [...messages, aiMessage];

            // Execute each tool call requested by the model and collect the results
            for (const toolCall of aiMessage.tool_calls) {
                const functionResult = await functions[toolCall.function.name](
                    JSON.parse(toolCall.function.arguments),
                    userId,
                    req
                );
                toolMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: JSON.stringify(functionResult),
                });
            }

            const secondResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "nvidia/nemotron-3-super-120b-a12b:free",
                    messages: toolMessages,
                }),
            });

            const secondData = await secondResponse.json();
            if (secondData.error) throw new Error(secondData.error.message || "OpenRouter Error (second call)");

            const responseText = secondData.choices[0].message.content;

            try {
                await query(
                    `INSERT INTO chat_history (user_id, role, content) VALUES ($1, $2, $3)`,
                    [userId, 'user', message]
                );
                await query(
                    `INSERT INTO chat_history (user_id, role, content, action_performed) VALUES ($1, $2, $3, $4)`,
                    [userId, 'model', responseText, actionWasPerformed]
                );
            } catch (logErr) {
                console.warn('Chat history save skipped:', logErr.message);
            }

            return NextResponse.json({
                text: responseText,
                actionPerformed: true,
            });
        }

        const responseText = aiMessage.content;

        try {
            await query(
                `INSERT INTO chat_history (user_id, role, content) VALUES ($1, $2, $3)`,
                [userId, 'user', message]
            );
            await query(
                `INSERT INTO chat_history (user_id, role, content, action_performed) VALUES ($1, $2, $3, $4)`,
                [userId, 'model', responseText, false]
            );
        } catch (logErr) {
            console.warn('Chat history save skipped:', logErr.message);
        }

        return NextResponse.json({
            text: responseText,
            actionPerformed: false,
        });

    } catch (error) {
        console.error("Chat API Error:", error);
        if (error.message?.includes("429"))
            return NextResponse.json({ error: "I've hit my limit. Please wait a moment! ⏳" }, { status: 429 });
        return NextResponse.json({ error: "AI service error." }, { status: 500 });
    }
}