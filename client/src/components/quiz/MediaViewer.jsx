import React, { useState } from 'react';
import { Image as ImageIcon, Music, Video as VideoIcon, AlertCircle } from 'lucide-react';

export function getMediaEmbedInfo(url, mediaType = 'image') {
  if (!url) return { type: mediaType, isEmbed: false, embedUrl: null, directUrl: null };
  const clean = url.trim();

  // YouTube match (watch?v=, youtu.be/, embed/, shorts/)
  const ytMatch = clean.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'video',
      isEmbed: true,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
    };
  }

  // Vimeo match
  const vimeoMatch = clean.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'video',
      isEmbed: true,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
    };
  }

  return {
    type: mediaType || 'image',
    isEmbed: false,
    directUrl: clean
  };
}

export default function MediaViewer({ mediaUrl, mediaType = 'image', className = '', autoPlay = false }) {
  const [loadError, setLoadError] = useState(false);

  if (!mediaUrl || !mediaUrl.trim()) return null;

  const info = getMediaEmbedInfo(mediaUrl, mediaType);
  const effectiveType = info.isEmbed ? 'video' : (mediaType || info.type || 'image');

  if (loadError) {
    return (
      <div className={`p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold ${className}`}>
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Unable to preview media from URL. Check if the link is accessible.</span>
      </div>
    );
  }

  // 1. YouTube or Vimeo Embed
  if (info.isEmbed && info.embedUrl) {
    return (
      <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-md border border-gray-200 dark:border-gray-800 ${className}`}>
        <iframe
          src={`${info.embedUrl}${autoPlay ? '?autoplay=1' : ''}`}
          title="Question Media Video"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // 2. Direct Video (mp4, webm, etc.)
  if (effectiveType === 'video') {
    return (
      <div className={`relative w-full rounded-2xl overflow-hidden bg-black shadow-md border border-gray-200 dark:border-gray-800 flex items-center justify-center ${className}`}>
        <video
          src={info.directUrl}
          controls
          autoPlay={autoPlay}
          onError={() => setLoadError(true)}
          className="max-h-64 sm:max-h-72 w-full object-contain rounded-2xl"
        >
          Your browser does not support HTML5 video.
        </video>
      </div>
    );
  }

  // 3. Audio Player (mp3, wav, etc.)
  if (effectiveType === 'audio') {
    return (
      <div className={`p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 border border-violet-200/80 dark:border-violet-900/60 space-y-2.5 shadow-sm ${className}`}>
        <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 text-xs font-bold uppercase tracking-wider">
          <Music className="w-4 h-4 animate-pulse text-[#635BFF]" />
          <span>Audio Clip</span>
        </div>
        <audio
          src={info.directUrl}
          controls
          autoPlay={autoPlay}
          onError={() => setLoadError(true)}
          className="w-full"
        >
          Your browser does not support HTML5 audio.
        </audio>
      </div>
    );
  }

  // 4. Image
  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-gray-50/50 dark:bg-[#12141F] border border-gray-200/80 dark:border-gray-800 p-2 shadow-xs ${className}`}>
      <img
        src={info.directUrl}
        alt="Question Media"
        onError={() => setLoadError(true)}
        className="max-h-60 sm:max-h-72 w-auto max-w-full rounded-xl object-contain"
        loading="lazy"
      />
    </div>
  );
}
