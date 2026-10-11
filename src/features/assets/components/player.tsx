"use client";

import { createContext, use, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react";

// Shares the video element of the asset page with the parts that read or move its time (comments)
const PlayerContext = createContext<RefObject<HTMLVideoElement | null> | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  return <PlayerContext value={videoRef}>{children}</PlayerContext>;
}

// Each server render signs a new url for the same file. Live updates re-render the page: keeping the first url
// stops the video from reloading mid-playback. A new version remounts the player (key) and takes its own url.
export function RushVideo({ src, ...props }: Omit<ComponentProps<"video">, "ref" | "src"> & { src: string }) {
  const videoRef = use(PlayerContext);
  const [stableSrc] = useState(src);
  return <video ref={videoRef} src={stableSrc} {...props} />;
}

export function RushImage({ src, alt, ...props }: Omit<ComponentProps<"img">, "src"> & { src: string; alt: string }) {
  const [stableSrc] = useState(src);
  // eslint-disable-next-line @next/next/no-img-element -- a signed url expires: nothing to optimize or cache
  return <img src={stableSrc} alt={alt} {...props} />;
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
