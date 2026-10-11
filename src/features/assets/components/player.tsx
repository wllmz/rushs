"use client";

import { createContext, use, useRef, type ComponentProps, type ReactNode, type RefObject } from "react";

// Shares the video element of the asset page with the parts that read or move its time (comments)
const PlayerContext = createContext<RefObject<HTMLVideoElement | null> | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  return <PlayerContext value={videoRef}>{children}</PlayerContext>;
}

export function RushVideo(props: Omit<ComponentProps<"video">, "ref">) {
  const videoRef = use(PlayerContext);
  return <video ref={videoRef} {...props} />;
}

export function usePlayer() {
  const videoRef = use(PlayerContext);

  return {
    // null without a video (an image, or outside a PlayerProvider)
    currentTime: () => videoRef?.current?.currentTime ?? null,
    seek: (seconds: number) => {
      const video = videoRef?.current;
      if (!video) return;
      video.currentTime = seconds;
      video.focus();
    },
  };
}
