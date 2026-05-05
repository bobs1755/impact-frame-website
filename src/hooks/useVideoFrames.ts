import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { extractFrameDataUrl } from '../utils/frameExtraction';

const STRIP_RADIUS = 5;

export function useVideoFrames(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const { videoMetadata, currentFrame } = useEditorStore();
  const [stripFrames, setStripFrames] = useState<Map<number, string>>(new Map());
  const [currentFrameDataUrl, setCurrentFrameDataUrl] = useState<string | null>(null);
  const extractingRef = useRef(false);
  const pendingRef = useRef<number | null>(null);

  const extractStrip = useCallback(async (center: number) => {
    const video = videoRef.current;
    if (!video || !videoMetadata) return;
    const { fps, width, height, totalFrames } = videoMetadata;
    const thumbW = Math.round(width / 4);
    const thumbH = Math.round(height / 4);

    const frames: number[] = [];
    for (let i = center - STRIP_RADIUS; i <= center + STRIP_RADIUS; i++) {
      if (i >= 0 && i < totalFrames) frames.push(i);
    }

    const newMap = new Map<number, string>();
    for (const f of frames) {
      try {
        const url = await extractFrameDataUrl(video, f, fps, thumbW, thumbH);
        newMap.set(f, url);
      } catch {
        // skip failed frames
      }
    }
    setStripFrames(newMap);
  }, [videoRef, videoMetadata]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoMetadata) return;
    const { fps, width, height } = videoMetadata;

    if (extractingRef.current) {
      pendingRef.current = currentFrame;
      return;
    }

    extractingRef.current = true;

    (async () => {
      try {
        const url = await extractFrameDataUrl(video, currentFrame, fps, width, height);
        setCurrentFrameDataUrl(url);
        await extractStrip(currentFrame);
      } finally {
        extractingRef.current = false;
        if (pendingRef.current !== null) {
          const next = pendingRef.current;
          pendingRef.current = null;
          useEditorStore.getState().seekToFrame(next);
        }
      }
    })();
  }, [currentFrame, videoMetadata, videoRef, extractStrip]);

  return { currentFrameDataUrl, stripFrames, STRIP_RADIUS };
}
