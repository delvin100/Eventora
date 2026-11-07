import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Music, Video as VideoIcon, AlertCircle } from 'lucide-react';

/**
 * Extracts Google Drive, YouTube, or Vimeo identifiers and returns embed/direct playback info.
 */
export function getMediaEmbedInfo(url, mediaType = 'image') {
  if (!url) return { type: mediaType, isEmbed: false, isGoogleDrive: false, embedUrl: null, directUrl: null };
  const clean = url.trim();

  // 1. Google Drive match
  const driveMatch = clean.match(
    /(?:drive\.google\.com\/(?:file\/d\/|open\?(?:.*&)?id=|uc\?(?:.*&)?id=)|docs\.google\.com\/(?:file\/d\/|uc\?(?:.*&)?id=))([a-zA-Z0-9_-]+)/i
  );
  if (driveMatch && driveMatch[1]) {
    const driveId = driveMatch[1];
    return {
      type: mediaType || 'image',
      isGoogleDrive: true,
      isEmbed: true,
      driveId,
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      directUrl: `https://lh3.googleusercontent.com/d/${driveId}`
    };
  }

  // 2. YouTube match (watch?v=, youtu.be/, embed/, shorts/)
  const ytMatch = clean.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'video',
      isGoogleDrive: false,
      isEmbed: true,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
    };
  }

  // 3. Vimeo match
  const vimeoMatch = clean.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'video',
      isGoogleDrive: false,
      isEmbed: true,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
    };
  }

  // 4. Direct web URL
  return {
    type: mediaType || 'image',
    isGoogleDrive: false,
    isEmbed: false,
    directUrl: clean
  };
}

export default function MediaViewer({ mediaUrl, mediaType = 'image', className = '', autoPlay = false }) {
  const [loadError, setLoadError] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  // Reset error states when URL or type changes
  useEffect(() => {
    setLoadError(false);
    setUseIframeFallback(false);
  }, [mediaUrl, mediaType]);

  if (!mediaUrl || !mediaUrl.trim()) return null;

  const info = getMediaEmbedInfo(mediaUrl, mediaType);
  const effectiveType = mediaType || info.type || 'image';

  if (loadError) {
    return (
      <div className={`p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col items-center justify-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-semibold text-center ${className}`}>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Unable to preview media from URL.</span>
        </div>
        {info.isGoogleDrive && (
          <p className="text-[11px] font-normal text-rose-500/90 dark:text-rose-400/80">
            Make sure your Google Drive link sharing is set to <strong>"Anyone with the link can view"</strong>.
          </p>
        )}
      </div>
    );
  }

  // 1. Google Drive Video
  if (info.isGoogleDrive && effectiveType === 'video') {
    return (
      <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-md border border-gray-200 dark:border-gray-800 ${className}`}>
        <iframe
          src={info.embedUrl}
          title="Google Drive Video"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // 2. Google Drive Audio
  if (info.isGoogleDrive && effectiveType === 'audio') {
    return (
      <div className={`relative w-full rounded-2xl overflow-hidden bg-[#161925] shadow-md border border-gray-200 dark:border-gray-800 ${className}`}>
        <div className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border-b border-gray-200/50 dark:border-gray-800/80 text-violet-700 dark:text-violet-300 text-xs font-bold">
          <Music className="w-3.5 h-3.5 text-[#635BFF]" />
          <span>Google Drive Audio Player</span>
        </div>
        <iframe
          src={info.embedUrl}
          title="Google Drive Audio"
          className="w-full h-36 sm:h-44 border-0"
          allow="autoplay"
        />
      </div>
    );
  }

  // 3. Google Drive Image
  if (info.isGoogleDrive && effectiveType === 'image') {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-gray-50/50 dark:bg-[#12141F] border border-gray-200/80 dark:border-gray-800 p-2 shadow-xs ${className}`}>
        {!useIframeFallback ? (
          <img
            src={info.directUrl}
            alt="Google Drive Image"
            onError={() => setUseIframeFallback(true)}
            className="max-h-64 sm:max-h-80 w-auto max-w-full rounded-xl object-contain"
            loading="lazy"
          />
        ) : (
          <iframe
            src={info.embedUrl}
            title="Google Drive Image Preview"
            className="w-full aspect-video sm:aspect-square max-h-80 border-0 rounded-xl"
            onError={() => setLoadError(true)}
          />
        )}
      </div>
    );
  }

  // 4. YouTube or Vimeo Embed
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

  // 5. Direct HTML5 Video (mp4, webm, etc.)
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

  // 6. Direct HTML5 Audio Player (mp3, wav, etc.)
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

  // 7. Direct Image (.jpg, .png, .gif, web image URL)
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
