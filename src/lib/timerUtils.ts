import { TaskItem, TaskStatus } from '../types';

export interface TimerFields {
  timer_started_at: string | null;
  timer_accumulated_seconds: number;
  is_timer_running: boolean;
  hours_spent: number;
}

/**
 * Returns the stored accumulated seconds for a task, falling back to
 * hours_spent * 3600 for legacy records that predate timer tracking.
 */
export function getTaskBaseSeconds(
  task: Pick<TaskItem, 'timer_accumulated_seconds' | 'hours_spent'>
): number {
  if (typeof task.timer_accumulated_seconds === 'number') {
    return Math.max(0, Math.floor(task.timer_accumulated_seconds));
  }
  return Math.max(0, Math.round((Number(task.hours_spent) || 0) * 3600));
}

/**
 * Computes the total live elapsed seconds for a task at `nowMs`.
 */
export function getTaskElapsedSeconds(
  task: Pick<
    TaskItem,
    'timer_accumulated_seconds' | 'timer_started_at' | 'is_timer_running' | 'hours_spent'
  >,
  nowMs: number = Date.now()
): number {
  const base = getTaskBaseSeconds(task);
  if (task.is_timer_running && task.timer_started_at) {
    const startedMs = new Date(task.timer_started_at).getTime();
    if (!Number.isNaN(startedMs)) {
      const runningDelta = Math.max(0, Math.floor((nowMs - startedMs) / 1000));
      return base + runningDelta;
    }
  }
  return base;
}

/**
 * Converts exact seconds into decimal hours (2 decimal places).
 * Ensures any non-zero tracked session logs at least 0.01 hrs.
 */
export function secondsToHours(totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  const rounded = Math.round((totalSeconds / 3600) * 100) / 100;
  return Math.max(0.01, Math.min(999.99, rounded));
}

/**
 * Formats seconds as HH:MM:SS for live timer display.
 */
export function formatTimerDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

/**
 * Computes the next timer fields when a task transitions to `nextStatus`.
 * - Entering `in_progress`: automatically starts/resumes the timer.
 * - Moving out of `in_progress` (e.g. `review`, `completed`, `blocked`, `todo`):
 *   automatically stops the timer, flushes elapsed seconds, and logs `hours_spent`.
 */
export function computeTimerStateForStatusChange(
  existingTask: TaskItem | null,
  nextStatus: TaskStatus,
  nowIso: string = new Date().toISOString()
): TimerFields {
  const nowMs = new Date(nowIso).getTime();

  if (nextStatus === 'in_progress') {
    if (
      existingTask &&
      existingTask.status === 'in_progress' &&
      existingTask.is_timer_running &&
      existingTask.timer_started_at
    ) {
      const base = getTaskBaseSeconds(existingTask);
      return {
        timer_started_at: existingTask.timer_started_at,
        timer_accumulated_seconds: base,
        is_timer_running: true,
        hours_spent: existingTask.hours_spent,
      };
    }

    const accumulated = existingTask
      ? getTaskElapsedSeconds(existingTask, nowMs)
      : 0;
    return {
      timer_started_at: nowIso,
      timer_accumulated_seconds: accumulated,
      is_timer_running: true,
      hours_spent: secondsToHours(accumulated),
    };
  }

  // Any status other than in_progress (todo, review, completed, blocked): stop timer & log hours
  const totalSeconds = existingTask
    ? getTaskElapsedSeconds(existingTask, nowMs)
    : 0;
  return {
    timer_started_at: null,
    timer_accumulated_seconds: totalSeconds,
    is_timer_running: false,
    hours_spent: secondsToHours(totalSeconds),
  };
}

/**
 * Pauses a currently running timer, flushing elapsed time and updating hours_spent.
 */
export function computePauseTimerState(
  task: TaskItem,
  nowIso: string = new Date().toISOString()
): TimerFields {
  const nowMs = new Date(nowIso).getTime();
  const totalSeconds = getTaskElapsedSeconds(task, nowMs);
  return {
    timer_started_at: null,
    timer_accumulated_seconds: totalSeconds,
    is_timer_running: false,
    hours_spent: secondsToHours(totalSeconds),
  };
}

/**
 * Resumes a paused timer on an `in_progress` task.
 */
export function computeResumeTimerState(
  task: TaskItem,
  nowIso: string = new Date().toISOString()
): TimerFields {
  const baseSeconds = getTaskBaseSeconds(task);
  return {
    timer_started_at: nowIso,
    timer_accumulated_seconds: baseSeconds,
    is_timer_running: true,
    hours_spent: secondsToHours(baseSeconds),
  };
}
