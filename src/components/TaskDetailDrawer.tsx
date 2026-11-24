import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MessageSquare,
  Send,
  Edit3,
  Trash2,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  FolderKanban,
  Play,
  Pause,
  Timer,
  PictureInPicture2,
} from 'lucide-react';
import {
  Profile,
  TaskComment,
  TaskItem,
  TaskStatus,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from '../types';
import {
  formatTimerDuration,
  getTaskElapsedSeconds,
  secondsToHours,
} from '../lib/timerUtils';

interface TaskDetailDrawerProps {
  task: TaskItem | null;
  onClose: () => void;
  currentUser: Profile;
  profilesMap: Record<string, Profile>;
  comments: TaskComment[];
  nowMs: number;
  onToggleTimer: (taskId: string) => Promise<void>;
  onFloatTimer?: () => void;
  isTimerFloating?: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onUpdateFeedback: (taskId: string, feedback: string) => Promise<void>;
  onAddComment: (taskId: string, content: string) => Promise<void>;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onRestoreTask: (taskId: string) => Promise<void>;
  onPermanentDeleteTask?: (taskId: string) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  onClose,
  currentUser,
  profilesMap,
  comments,
  nowMs,
  onToggleTimer,
  onFloatTimer,
  isTimerFloating,
  onStatusChange,
  onUpdateFeedback,
  onAddComment,
  onEditTask,
  onDeleteTask,
  onRestoreTask,
  onPermanentDeleteTask,
}) => {
  const [commentText, setCommentText] = useState('');
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [editingFeedback, setEditingFeedback] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);

  if (!task) return null;

  const isManager =
    currentUser.role === 'manager' || currentUser.role === 'superadmin';
  const employeeProfile = profilesMap[task.employee_id];
  const creatorProfile = profilesMap[task.created_by];
  const wasAssignedByManager = task.created_by !== task.employee_id;
  const isDeleted = Boolean(task.is_deleted);
  const deletedByDisplay =
    task.deleted_by_name ||
    (task.deleted_by ? profilesMap[task.deleted_by]?.full_name : null) ||
    'User';

  const taskComments = comments.filter((c) => c.task_id === task.id);
  const elapsedSeconds = getTaskElapsedSeconds(task, nowMs);
  const displayHours =
    task.is_timer_running && task.timer_started_at
      ? secondsToHours(elapsedSeconds)
      : Number(task.hours_spent) || 0;

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText('');
    await onAddComment(task.id, text);
  };

  const handleSaveFeedback = async () => {
    setSavingFeedback(true);
    try {
      await onUpdateFeedback(task.id, feedbackDraft.trim());
      setEditingFeedback(false);
    } finally {
      setSavingFeedback(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {isDeleted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white">
                <Trash2 className="w-3 h-3" /> Soft Deleted
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                STATUS_CONFIG[task.status].badgeClass
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[task.status].dotClass}`} />
              {STATUS_CONFIG[task.status].label}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                PRIORITY_CONFIG[task.priority].badgeClass
              }`}
            >
              {PRIORITY_CONFIG[task.priority].label} Priority
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {task.category}
            </span>
            {task.project_name && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <FolderKanban className="w-3 h-3" />
                {task.project_name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!isDeleted && (
              <button
                onClick={() => onEditTask(task)}
                title="Edit Task"
                className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {isDeleted ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={async () => {
                    await onRestoreTask(task.id);
                  }}
                  title="Restore Task"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
                {currentUser.role === 'superadmin' && onPermanentDeleteTask && (
                  <button
                    onClick={() => onPermanentDeleteTask(task.id)}
                    title="Delete Permanently (Superadmin Only)"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => onDeleteTask(task.id)}
                title="Soft Delete Task"
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Soft-Delete Audit Notice */}
          {isDeleted && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  Task Log Soft-Deleted (Archived in Database)
                </span>
              </div>
              <p className="text-xs text-rose-800">
                Deleted by: <strong>{deletedByDisplay}</strong>
                {task.deleted_at && (
                  <>
                    {' '}
                    on{' '}
                    <strong>
                      {new Date(task.deleted_at).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Title & Meta */}
          <div>
            {wasAssignedByManager && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold mb-2">
                <UserCheck className="w-3.5 h-3.5" />
                Assigned by {creatorProfile?.full_name || 'Manager'}
              </div>
            )}
            <h2 className="text-xl font-bold text-slate-900 leading-snug">{task.title}</h2>
            <p className="text-sm text-slate-600 mt-2 whitespace-pre-line leading-relaxed">
              {task.description || 'No additional description provided.'}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Employee</span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {employeeProfile?.full_name || 'Employee'}
              </span>
              <span className="text-[11px] text-slate-500">
                {employeeProfile?.department || 'General'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <FolderKanban className="w-3.5 h-3.5" /> Project
              </span>
              <span className="font-bold text-indigo-700 mt-0.5 block">
                {task.project_name || 'Unassigned'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Hours Logged
              </span>
              <span className="font-bold text-indigo-600 text-sm mt-0.5 block">
                {displayHours.toFixed(2)} hrs
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Task Date
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block">{task.task_date}</span>
            </div>

            <div>
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Due Date
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {task.due_date || '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Date Completed
              </span>
              <span
                className={`font-bold mt-0.5 block ${
                  task.completed_date ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {task.completed_date || 'Not completed'}
              </span>
            </div>
          </div>

          {/* Automated Work Timer Panel */}
          {!isDeleted && (
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                task.status === 'in_progress'
                  ? task.is_timer_running
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-amber-50/70 border-amber-200'
                  : task.status === 'review'
                  ? 'bg-amber-50/50 border-amber-200'
                  : task.status === 'completed'
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <Timer className="w-4 h-4 text-indigo-600" />
                    <span>Automated Work Timer</span>
                    {task.status === 'in_progress' && (
                      <span
                        className={`ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          task.is_timer_running
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            task.is_timer_running
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-amber-500'
                          }`}
                        />
                        {task.is_timer_running ? 'Running' : 'Paused'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2.5 pt-0.5">
                    <span className="text-2xl font-mono font-extrabold text-slate-900 tracking-tight">
                      {formatTimerDuration(elapsedSeconds)}
                    </span>
                    <span className="text-xs font-semibold text-indigo-700">
                      ({displayHours.toFixed(2)} hrs)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {task.status === 'in_progress' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onToggleTimer(task.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border shadow-2xs transition cursor-pointer ${
                          task.is_timer_running
                            ? 'bg-white hover:bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                        }`}
                      >
                        {task.is_timer_running ? (
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
                        onClick={() => onStatusChange(task.id, 'review')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Send to Review & Log</span>
                      </button>

                      {onFloatTimer && (
                        <button
                          type="button"
                          onClick={onFloatTimer}
                          title="Pop out always-on-top floating timer on your desktop"
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shadow-2xs transition cursor-pointer ${
                            isTimerFloating
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          <PictureInPicture2 className="w-3.5 h-3.5" />
                          <span>{isTimerFloating ? 'Floating' : 'Float on Desktop'}</span>
                        </button>
                      )}
                    </>
                  )}

                  {task.status === 'review' && (
                    <button
                      type="button"
                      onClick={() => onStatusChange(task.id, 'completed')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark as Completed</span>
                    </button>
                  )}

                  {(task.status === 'todo' || task.status === 'blocked') && (
                    <button
                      type="button"
                      onClick={() => onStatusChange(task.id, 'in_progress')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start In Progress</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-600">
                {task.status === 'in_progress'
                  ? 'Timer runs automatically while In Progress. Pause/Continue anytime; moving to For Review logs your hours.'
                  : task.status === 'review'
                  ? 'Timer stopped and hours logged. Mark as Completed once review is approved, or move back to In Progress to continue timing.'
                  : task.status === 'completed'
                  ? `Final time of ${displayHours.toFixed(2)} hrs logged and task completed.`
                  : 'Move task to In Progress to start tracking hours automatically.'}
              </p>
            </div>
          )}

          {/* Quick Status Switcher */}
          {!isDeleted && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Quick Update Task Status
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((st) => {
                  const active = task.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onStatusChange(task.id, st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                        active
                          ? `${STATUS_CONFIG[st].badgeClass} ring-2 ring-offset-1 ring-indigo-500`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[st].dotClass}`} />
                      {STATUS_CONFIG[st].label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manager Feedback Box */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                Manager Review & Feedback
              </div>
              {isManager && !editingFeedback && (
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackDraft(task.manager_feedback || '');
                    setEditingFeedback(true);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                >
                  {task.manager_feedback ? 'Edit Feedback' : '+ Add Feedback'}
                </button>
              )}
            </div>

            {editingFeedback ? (
              <div className="space-y-2 pt-1">
                <textarea
                  rows={3}
                  value={feedbackDraft}
                  onChange={(e) => setFeedbackDraft(e.target.value)}
                  placeholder="Enter manager review notes or feedback for this employee..."
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingFeedback(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingFeedback}
                    onClick={handleSaveFeedback}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {savingFeedback ? 'Saving...' : 'Save Feedback'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-emerald-950">
                {task.manager_feedback ? (
                  task.manager_feedback
                ) : (
                  <span className="text-emerald-700/70 italic text-xs">
                    No manager feedback added yet.
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Activity & Comments Thread */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <MessageSquare className="w-4 h-4" />
              Task Updates & Comments ({taskComments.length})
            </div>

            {taskComments.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No comments yet. Post a progress note or question below.
              </p>
            ) : (
              <div className="space-y-2.5">
                {taskComments.map((cmt) => {
                  const author = profilesMap[cmt.author_id];
                  const authorName =
                    author?.full_name || cmt.author_name || 'User';
                  const authorRole =
                    author?.role || cmt.author_role || 'employee';
                  const isAuthorManager =
                    authorRole === 'manager' || authorRole === 'superadmin';
                  return (
                    <div
                      key={cmt.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                        authorRole === 'superadmin'
                          ? 'bg-purple-50/50 border-purple-100'
                          : isAuthorManager
                          ? 'bg-indigo-50/50 border-indigo-100'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">
                            {authorName}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                              authorRole === 'superadmin'
                                ? 'bg-purple-600 text-white'
                                : isAuthorManager
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {authorRole}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(cmt.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{cmt.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Comment Input Footer */}
        <form
          onSubmit={handleSendComment}
          className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Write a task update or comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Post</span>
          </button>
        </form>
      </div>
    </div>
  );
};
