import React, { useState } from 'react';
import { X, Database, Check, Copy, ExternalLink, ShieldCheck, KeyRound } from 'lucide-react';
import {
  getSupabaseConfig,
  saveRuntimeSupabaseConfig,
  clearRuntimeSupabaseConfig,
} from '../lib/supabase';
import sqlSchemaText from '../../supabase/schema.sql?raw';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [activeTab, setActiveTab] = useState<'connect' | 'sql' | 'github'>('connect');
  const [copiedSql, setCopiedSql] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) return;
    saveRuntimeSupabaseConfig(url, anonKey);
    setSavedMsg('Connected to Supabase! Reloading session...');
    setTimeout(() => {
      setSavedMsg('');
      onConfigChanged();
      onClose();
    }, 600);
  };

  const handleDisconnect = () => {
    clearRuntimeSupabaseConfig();
    setUrl('');
    setAnonKey('');
    onConfigChanged();
    onClose();
  };

  const handleCopySql = async () => {
    await navigator.clipboard.writeText(sqlSchemaText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Supabase Database & GitHub Cloud Setup
              </h2>
              <p className="text-xs text-slate-500">
                Connect your live Supabase PostgreSQL project with Row-Level Security (RLS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2 pt-2">
          <button
            onClick={() => setActiveTab('connect')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition cursor-pointer ${
              activeTab === 'connect'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Connect Credentials
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition cursor-pointer ${
              activeTab === 'sql'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            2. SQL Schema & RLS Policies
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition cursor-pointer ${
              activeTab === 'github'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            3. GitHub Pages Deployment
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'connect' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-100 text-sm text-indigo-950 flex gap-3">
                <KeyRound className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">How to connect your Supabase project:</p>
                  <ol className="list-decimal list-inside text-xs text-indigo-900 space-y-1">
                    <li>
                      Create a free project at{' '}
                      <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-medium inline-flex items-center gap-0.5"
                      >
                        supabase.com/dashboard <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      Run the SQL script from Tab 2 in your Supabase <strong>SQL Editor</strong>.
                    </li>
                    <li>
                      Copy your <strong>Project URL</strong> and <strong>anon public key</strong> from{' '}
                      <em>Project Settings → API</em> into the fields below (or into your <code>.env</code> file).
                    </li>
                  </ol>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Supabase Project URL (VITE_SUPABASE_URL)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Supabase Anon Public Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="text"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {savedMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {savedMsg}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                {currentConfig.isConfigured && currentConfig.source === 'runtime' ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm font-medium transition cursor-pointer"
                  >
                    Disconnect & Return to Demo Sandbox
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">
                    Current Status:{' '}
                    <strong className="text-slate-700">
                      {currentConfig.isConfigured
                        ? `Connected (${currentConfig.source})`
                        : 'Interactive Demo Sandbox'}
                    </strong>
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs transition cursor-pointer"
                  >
                    Save & Connect Supabase
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Enforces strict PostgreSQL RLS: <strong>Employees see only their own tasks</strong>;{' '}
                    <strong>Managers/Admins see all tasks</strong>.
                  </span>
                </div>
                <button
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied SQL!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy SQL Script
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
                {sqlSchemaText}
              </pre>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-4 text-sm text-slate-700">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900">
                  Automatic GitHub Pages Deployment (.github/workflows/deploy.yml)
                </h3>
                <p className="text-xs text-slate-600">
                  This repository includes a pre-configured GitHub Actions workflow that builds and publishes your app to GitHub Pages automatically whenever you push to <code>main</code>.
                </p>
              </div>

              <ol className="list-decimal list-inside space-y-3 text-slate-700">
                <li>
                  In your GitHub repository (<code>efrelie-bossupva/employee-task-manager</code>), go to{' '}
                  <strong>Settings → Pages</strong> and under <em>Build and deployment → Source</em>, select{' '}
                  <strong>GitHub Actions</strong>.
                </li>
                <li>
                  Go to <strong>Settings → Secrets and variables → Actions</strong> and add two Repository Secrets:
                  <ul className="list-disc list-inside ml-5 mt-1.5 space-y-1 font-mono text-xs text-indigo-700">
                    <li>VITE_SUPABASE_URL</li>
                    <li>VITE_SUPABASE_ANON_KEY</li>
                  </ul>
                </li>
                <li>
                  Push your code to the <code>main</code> branch. GitHub Actions will build and deploy your live web app!
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

