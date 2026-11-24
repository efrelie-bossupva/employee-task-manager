import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  CheckCircle2,
  PictureInPicture2,
  ExternalLink,
  Timer,
  X,
} from 'lucide-react';
import { TaskItem } from '../types';
import {
  formatTimerDuration,
  getTaskElapsedSeconds,
  secondsToHours,
} from '../lib/timerUtils';

declare global {
  interface DocumentPictureInPicture extends EventTarget {
    requestWindow(options?: {
      width?: number;
      height?: number;
      disallowReturnToOpener?: boolean;
      preferInitialWindowPlacement?: boolean;
    }): Promise<Window>;
    readonly window: Window | null;
  }

  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export interface FloatingTimerWidgetProps {
  inProgressTasks: TaskItem[];
  preferredTaskId?: string | null;
  nowMs: number;
  pipWindow: Window | null;
  onOpenPip: () => void;
  onClosePip: () => void;
  onToggleTimer: (taskId: string) => Promise<void>;
  onSendToReview: (taskId: string) => Promise<void>;
  onInspectTask: (taskId: string) => void;
}

const PIP_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
    background: #1e1017;
    color: #f8fafc;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .pip-shell {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 12px 14px;
    background: linear-gradient(135deg, #2b131e 0%, #3d1b2b 55%, #24101a 100%);
  }
  .pip-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .pip-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .pip-badge-running {
    background: rgba(16, 185, 129, 0.18);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.35);
  }
  .pip-badge-paused {
    background: rgba(245, 158, 11, 0.18);
    color: #fcd34d;
    border: 1px solid rgba(245, 158, 11, 0.35);
  }
  .pip-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
  }
  .pip-dot-running {
    background: #34d399;
    box-shadow: 0 0 8px #34d399;
    animation: pipPulse 1.4s ease-in-out infinite;
  }
  .pip-dot-paused {
    background: #fbbf24;
  }
  @keyframes pipPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.45; transform: scale(0.85); }
  }
  .pip-link-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #e2e8f0;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 7px;
    padding: 3px 8px;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .pip-link-btn:hover { background: rgba(255, 255, 255, 0.16); }
  .pip-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
  }
  .pip-title {
    font-size: 12px;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  .pip-select {
    background: rgba(255,255,255,0.1);
    color: #f8fafc;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    font-size: 11px;
    padding: 2px 6px;
    max-width: 100%;
    width: 100%;
    outline: none;
  }
  .pip-select option { background: #2b131e; color: #f8fafc; }
  .pip-clock-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 4px 0 6px;
  }
  .pip-clock {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 0.03em;
    color: #ffffff;
    line-height: 1;
  }
  .pip-hours {
    font-size: 12px;
    font-weight: 600;
    color: #fcd7ad;
  }
  .pip-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pip-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 7px 10px;
    border-radius: 9px;
    font-size: 11px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.15s, background 0.15s;
  }
  .pip-btn:active { transform: scale(0.98); }
  .pip-btn-pause {
    background: #fef3c7;
    color: #92400e;
  }
  .pip-btn-pause:hover { background: #fde68a; }
  .pip-btn-continue {
    background: #10b981;
    color: #ffffff;
  }
  .pip-btn-continue:hover { background: #059669; }
  .pip-btn-review {
    background: #9f3a4f;
    color: #ffffff;
  }
  .pip-btn-review:hover { background: #882f42; }
  .pip-empty {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 8px;
    padding: 14px;
  }
  .pip-empty-title {
    font-size: 13px;
    font-weight: 700;
    color: #6ee7b7;
  }
  .pip-empty-sub {
    font-size: 11px;
    color: #cbd5e1;
  }
`;

export function injectPipStyles(targetWindow: Window) {
  const doc = targetWindow.document;
  doc.title = 'Task Timer';
  let styleEl = doc.getElementById('etm-pip-styles') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = 'etm-pip-styles';
    styleEl.textContent = PIP_STYLES;
    doc.head.appendChild(styleEl);
  }
  let mount = doc.getElementById('etm-pip-root');
  if (!mount) {
    mount = doc.createElement('div');
    mount.id = 'etm-pip-root';
    mount.style.width = '100%';
    mount.style.height = '100%';
    doc.body.innerHTML = '';
    doc.body.appendChild(mount);
  }
  return mount;
}

export const FloatingTimerWidget: React.FC<FloatingTimerWidgetProps> = ({
  inProgressTasks,
  preferredTaskId = null,
  nowMs,
  pipWindow,
  onOpenPip,
  onClosePip,
  onToggleTimer,
  onSendToReview,
  onInspectTask,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [minimizedInApp, setMinimizedInApp] = useState(false);

  // Sync to the most recently started/resumed task
  useEffect(() => {
    if (preferredTaskId && inProgressTasks.some((t) => t.id === preferredTaskId)) {
      setSelectedId(preferredTaskId);
    }
  }, [preferredTaskId, inProgressTasks]);

  // Pick the active task: user-selected if still in_progress, else first running, else first in_progress
  const activeTask =
    inProgressTasks.find((t) => t.id === selectedId) ||
    inProgressTasks.find((t) => t.is_timer_running) ||
    inProgressTasks[0] ||
    null;

  useEffect(() => {
    if (activeTask && activeTask.id !== selectedId) {
      setSelectedId(activeTask.id);
    }
  }, [activeTask, selectedId]);

  const pipMount = pipWindow && !pipWindow.closed ? injectPipStyles(pipWindow) : null;

  const elapsedSeconds = activeTask
    ? getTaskElapsedSeconds(activeTask, nowMs)
    : 0;
  const displayHours = activeTask
    ? activeTask.is_timer_running && activeTask.timer_started_at
      ? secondsToHours(elapsedSeconds)
      : Number(activeTask.hours_spent) || 0
    : 0;

  // Content rendered inside the always-on-top Document PiP desktop window
  const pipContent = (
    <div className="pip-shell">
      {activeTask ? (
        <>
          <div>
            <div className="pip-top">
              <span
                className={`pip-badge ${
                  activeTask.is_timer_running
                    ? 'pip-badge-running'
                    : 'pip-badge-paused'
                }`}
              >
                <span
                  className={`pip-dot ${
                    activeTask.is_timer_running
                      ? 'pip-dot-running'
                      : 'pip-dot-paused'
                  }`}
                />
                {activeTask.is_timer_running ? 'Running' : 'Paused'}
              </span>

              <button
                type="button"
                className="pip-link-btn"
                onClick={() => {
                  window.focus();
                  onInspectTask(activeTask.id);
                }}
              >
                Open App
              </button>
            </div>

            <div className="pip-title-row">
              {inProgressTasks.length > 1 ? (
                <select
                  className="pip-select"
                  value={activeTask.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {inProgressTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.is_timer_running ? '● ' : '❚❚ '}
                      {t.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="pip-title" title={activeTask.title}>
                  {activeTask.title}
                </div>
              )}
            </div>
          </div>

          <div className="pip-clock-row">
            <span className="pip-clock">
              {formatTimerDuration(elapsedSeconds)}
            </span>
            <span className="pip-hours">({displayHours.toFixed(2)} hrs)</span>
          </div>

          <div className="pip-actions">
            <button
              type="button"
              className={`pip-btn ${
                activeTask.is_timer_running
                  ? 'pip-btn-pause'
                  : 'pip-btn-continue'
              }`}
              onClick={() => onToggleTimer(activeTask.id)}
            >
              {activeTask.is_timer_running ? '❚❚ Pause' : '▶ Continue'}
            </button>
            <button
              type="button"
              className="pip-btn pip-btn-review"
              onClick={() => onSendToReview(activeTask.id)}
            >
              ✓ Review & Log
            </button>
          </div>
        </>
      ) : (
        <div className="pip-empty">
          <div className="pip-empty-title">✓ All Active Timers Logged</div>
          <div className="pip-empty-sub">
            Start a task in In Progress to resume tracking.
          </div>
          <button
            type="button"
            className="pip-link-btn"
            onClick={() => {
              window.focus();
              onClosePip();
            }}
          >
            Close Floating Timer
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Always-on-top Document PiP Desktop Window Portal */}
      {pipMount && createPortal(pipContent, pipMount)}

      {/* In-app bottom-right floating timer bar (only when there is an In Progress task) */}
      {activeTask && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm">
          {minimizedInApp ? (
            <button
              type="button"
              onClick={() => setMinimizedInApp(false)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#3d1b2b] text-white shadow-xl border border-white/15 hover:bg-[#4e2236] transition cursor-pointer"
              title="Expand Active Timer"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeTask.is_timer_running
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span className="font-mono text-xs font-bold">
                {formatTimerDuration(elapsedSeconds)}
              </span>
            </button>
          ) : (
            <div className="bg-[#2b131e] text-white rounded-2xl shadow-2xl border border-white/15 p-3.5 w-80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-[#fcd7ad]" />
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      activeTask.is_timer_running
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeTask.is_timer_running
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-amber-400'
                      }`}
                    />
                    {activeTask.is_timer_running ? 'Counting' : 'Paused'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {pipWindow && !pipWindow.closed ? (
                    <button
                      type="button"
                      onClick={onClosePip}
                      title="Close Desktop Floating Timer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-400/30 text-[10px] font-semibold transition cursor-pointer"
                    >
                      <PictureInPicture2 className="w-3 h-3" />
                      <span>Floating</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenPip}
                      title="Pop out always-on-top floating timer on your desktop"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 text-[10px] font-semibold transition cursor-pointer"
                    >
                      <PictureInPicture2 className="w-3 h-3" />
                      <span>Float on Desktop</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMinimizedInApp(true)}
                    title="Minimize bar"
                    className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Task selector or title */}
              <div className="flex items-center justify-between gap-2">
                {inProgressTasks.length > 1 ? (
                  <select
                    aria-label="Select active timed task"
                    value={activeTask.id}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-xs font-semibold text-white focus:outline-none"
                  >
                    {inProgressTasks.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#2b131e]">
                        {t.is_timer_running ? '● ' : '❚❚ '}
                        {t.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => onInspectTask(activeTask.id)}
                    className="text-left text-xs font-semibold text-white/95 hover:text-[#fcd7ad] truncate flex items-center gap-1 cursor-pointer"
                    title={activeTask.title}
                  >
                    <span className="truncate">{activeTask.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                  </button>
                )}
              </div>

              {/* Live clock */}
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl font-extrabold tracking-tight text-white">
                  {formatTimerDuration(elapsedSeconds)}
                </span>
                <span className="text-xs font-semibold text-[#fcd7ad]">
                  {displayHours.toFixed(2)} hrs
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => onToggleTimer(activeTask.id)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTask.is_timer_running
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {activeTask.is_timer_running ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Continue</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSendToReview(activeTask.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#9f3a4f] hover:bg-[#882f42] text-white text-xs font-bold transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Review & Log</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
