import React, { useState } from 'react';
import { Settings, X, Video as VideoIcon, Music, Image as ImageIcon, Link as LinkIcon, Check, Loader2 } from 'lucide-react';
import MediaViewer from './MediaViewer';

export default function QuizSettingsModal({ quiz, isOpen, onClose, onSave }) {
  if (!isOpen || !quiz) return null;

  const [name, setName] = useState(quiz.name || '');
  const [description, setDescription] = useState(quiz.description || '');
  const [introMediaUrl, setIntroMediaUrl] = useState(quiz.introMediaUrl || '');
  const [introMediaType, setIntroMediaType] = useState(quiz.introMediaType || 'video');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Quiz title is required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        introMediaUrl: introMediaUrl.trim(),
        introMediaType,
        rounds: quiz.rounds || []
      });
      onClose();
    } catch (err) {
      console.error('Failed to save quiz settings:', err);
      setError(err.message || 'Failed to update quiz settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Quiz Settings & Intro</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure quiz details and optional welcome media</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quiz Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
              Quiz Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#12141F] text-sm text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30"
              placeholder="e.g. Annual Tech Symposium Quiz"
            />
          </div>

          {/* Quiz Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
              Description <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#12141F] text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 resize-none"
              placeholder="Short description or guidelines for this quiz..."
            />
          </div>

          {/* Quiz Intro Media Section */}
          <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700 dark:text-violet-300">
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Quiz Intro Media (Optional)</span>
              </div>

              {/* Media Type Tabs */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#12141F] p-0.5 rounded-lg border border-violet-200/60 dark:border-violet-800/60 text-xs">
                <button
                  type="button"
                  onClick={() => setIntroMediaType('video')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    introMediaType === 'video'
                      ? 'bg-[#635BFF] text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <VideoIcon className="w-3 h-3" />
                  <span>Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIntroMediaType('audio')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    introMediaType === 'audio'
                      ? 'bg-[#635BFF] text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Music className="w-3 h-3" />
                  <span>Audio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIntroMediaType('image')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    introMediaType === 'image'
                      ? 'bg-[#635BFF] text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Image</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Shown on screen when participants or the host clicks <strong>Start Quiz</strong>.
            </p>

            <input
              type="url"
              value={introMediaUrl}
              onChange={(e) => setIntroMediaUrl(e.target.value)}
              placeholder={
                introMediaType === 'video'
                  ? 'Paste Google Drive video link, YouTube, Vimeo, or .mp4 URL...'
                  : introMediaType === 'audio'
                  ? 'Paste Google Drive audio link or audio URL (.mp3, .wav)...'
                  : 'Paste Google Drive image link or direct image URL...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-violet-200/80 dark:border-violet-800/80 bg-white dark:bg-[#12141F] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400"
            />

            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Supports <strong>Google Drive</strong> (ensure sharing is set to "Anyone with the link can view"), <strong>YouTube</strong>, <strong>Vimeo</strong>, or direct links. Leave empty if no intro is needed.
            </p>

            {introMediaUrl && (
              <div className="pt-2 border-t border-violet-100 dark:border-violet-900/30">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Intro Media Preview
                </div>
                <div className="rounded-xl overflow-hidden max-h-56">
                  <MediaViewer mediaUrl={introMediaUrl} mediaType={introMediaType} />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#635BFF] hover:bg-[#5145E5] transition-all cursor-pointer shadow-md shadow-[#635BFF]/25 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

