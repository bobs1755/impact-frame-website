import { useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { detectFps } from '../../utils/frameExtraction';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function VideoPlayer({ videoRef }: Props) {
  const { videoUrl, setVideoMetadata } = useEditorStore();
  const metaLoadedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    metaLoadedRef.current = false;

    const onLoadedMetadata = async () => {
      if (metaLoadedRef.current) return;
      metaLoadedRef.current = true;
      const { duration, videoWidth, videoHeight } = video;
      const fps = await detectFps(video);
      video.pause();
      video.currentTime = 0;
      setVideoMetadata({
        duration,
        fps,
        width: videoWidth,
        height: videoHeight,
        totalFrames: Math.floor(duration * fps),
      });
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
  }, [videoUrl, videoRef, setVideoMetadata]);

  return (
    <video
      ref={videoRef as React.RefObject<HTMLVideoElement>}
      src={videoUrl ?? undefined}
      className="hidden"
      crossOrigin="anonymous"
      preload="auto"
      muted
    />
  );
}
