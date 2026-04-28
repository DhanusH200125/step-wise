import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

// Determines the current phase of the day to suggest appropriate tasks
function getCurrentPeriod() {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 23) return 'evening';
  return 'late_night';
}

// Maps user energy preferences to the current time period
function getPeriodEnergy(energyProfile, period) {
  return energyProfile[period] || energyProfile['evening'] || 'medium';
}

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request); 
    if (!user) {
      return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const uid = user.userId ?? user.userid ?? user.id;

    // Calculate current time context for recommendations
    const currentPeriod = getCurrentPeriod();

    // Fetch user energy profile from preferences
    const prefsRes = await query(
      'SELECT preferences FROM users WHERE id = $1',
      [uid] 
    );
    const prefs = prefsRes.rows[0]?.preferences || {};
    const energyProfile = prefs.energyprofile || 
      { morning: 'high', afternoon: 'medium', evening: 'low' };
    const currentPeriodEnergy = getPeriodEnergy(energyProfile, currentPeriod);

    // Retrieve all active tasks to evaluate as candidates, excluding those skipped
    const tasksRes = await query(
      `SELECT *, id as taskid FROM tasks
       WHERE user_id = $1
         AND status IN ('pending', 'scheduled', 'in_progress')
         AND skipped_at IS NULL
       ORDER BY priority DESC, deadline ASC NULLS LAST`,
      [uid] 
    );
    const candidateTasks = tasksRes.rows;

    // Analyze task distribution across domains for the current week (Mon–Sun)
    const weekStart = new Date();
    const todayDow = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (todayDow === 0 ? 6 : todayDow - 1));
    weekStart.setHours(0, 0, 0, 0);

    const completedRes = await query(
      `SELECT domain, COUNT(*) as count FROM tasks
       WHERE user_id = $1
         AND status = 'completed'
         AND completed_at >= $2
       GROUP BY domain`,
      [uid, weekStart.toISOString()] 
    );
    const completedByDomain = {};
    completedRes.rows.forEach(row => {
      completedByDomain[row.domain] = parseInt(row.count);
    });

    const domains = ['Work/Study', 'Personal Growth', 'Health', 'Life Admin'];
    const minCompleted = Math.min(...domains.map(d => completedByDomain[d] || 0));

    // Calculate a 'now score' for each task based on multiple factors
    const scoredTasks = candidateTasks.map(task => {
      // Factor 1: Deadline Urgency (35% weight)
      let deadlineBoost = 0.1;
      if (task.deadline) {
        const hoursUntil = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60);
        if      (hoursUntil < 0)  deadlineBoost = 0.1;
        else if (hoursUntil < 24) deadlineBoost = 1.0;
        else if (hoursUntil < 48) deadlineBoost = 0.8;
        else if (hoursUntil < 72) deadlineBoost = 0.5;
      }

      // Factor 2: Energy Fit (25% weight)
      const energyLevels = { low: 1, medium: 2, high: 3 };
      const taskEnergyLevel    = energyLevels[task.energy?.toLowerCase()] || 2;
      const currentEnergyLevel = energyLevels[currentPeriodEnergy]        || 2;
      const energyDistance     = Math.abs(taskEnergyLevel - currentEnergyLevel);
      const energyFit = energyDistance === 0 ? 1.0 : energyDistance === 1 ? 0.5 : 0.2;

      // Factor 3: Priority level (25% weight)
      const priorityFactor = task.priority === 3 ? 1.0 : task.priority === 2 ? 0.6 : 0.3;

      // Factor 4: Domain Balance (15% weight)
      const domainCompleted = completedByDomain[task.domain] || 0;
      const domainDeficit   = domainCompleted === minCompleted ? 0.8
                            : domainCompleted === minCompleted + 1 ? 0.4
                            : 0.1;

      // Final weighted scoring logic
      const nowScore = (deadlineBoost * 0.35) + (energyFit * 0.25) + (priorityFactor * 0.25) + (domainDeficit * 0.15);

      // Generate a human-readable explanation for the recommendation
      const maxFactor = Math.max(deadlineBoost, energyFit, priorityFactor, domainDeficit);
      let explanation = 'Recommended for right now.';
      if (deadlineBoost === maxFactor && deadlineBoost > 0.3) {
        if      (deadlineBoost === 1.0) explanation = "Due tomorrow. Don't risk missing this deadline.";
        else if (deadlineBoost === 0.8) explanation = "Due in 2 days. Getting urgent.";
        else if (deadlineBoost === 0.5) explanation = "Due within the week.";
      } else if (energyFit === maxFactor && energyFit >= 0.5) {
        explanation = `Perfect match for your ${currentPeriod.replace('_', ' ')} ${currentPeriodEnergy}-energy window.`;
      } else if (domainDeficit === maxFactor && domainDeficit >= 0.4) {
        explanation = `You haven't done any ${task.domain} tasks this week.`;
      } else if (priorityFactor === maxFactor && priorityFactor >= 0.6) {
        explanation = "This is your highest priority pending task.";
      }
      if (task.duration <= 30) explanation += " Quick task (≤30 min).";

      return {
        
        taskid:      task.id,
        title:       task.title,
        domain:      task.domain,
        priority:    task.priority,
        duration:    task.duration,
        energy:      task.energy,
        deadline:    task.deadline,
        nowscore:    Math.round(nowScore * 100) / 100,
        explanation,
        status:      task.status,
        startedAt:   task.startedAt,
        factors: {
          deadlineboost: deadlineBoost, 
          energyfit:     energyFit,     
          priority:      priorityFactor,
          domaindeficit: domainDeficit, 
        },
      };
    });

    // Sort and identify recommendations
    const sortedScored = scoredTasks.sort((a, b) => b.nowscore - a.nowscore);
    
    // Always include the in_progress task if it exists, plus top picks
    const inProgressTask = sortedScored.find(t => t.status === 'in_progress');
    const topPicks = sortedScored.filter(t => t.status !== 'in_progress').slice(0, 3);
    
    // Combine them: active task first (if any), then top picks
    const recommendations = inProgressTask 
      ? [inProgressTask, ...topPicks.filter(t => t.taskid !== inProgressTask.taskid)].slice(0, 4)
      : topPicks;

    return Response.json({
      success: true,
      data: {
        
        currentperiod: currentPeriod,
        currentenergy: currentPeriodEnergy,
        recommendations,
      },
    });
  } catch (error) {
    console.error('Error getting now recommendations:', error);
    return Response.json({ success: false, error: 'Failed to get recommendations' }, { status: 500 });
  }
}