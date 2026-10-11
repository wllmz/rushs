"use client";

import { createContext, use, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react";

// Shares the video element of the asset page with the parts that read or move its time (comments)
const PlayerContext = createContext<RefObject<HTMLVideoElement | null> | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  return <PlayerContext value={videoRef}>{children}</PlayerContext>;
}

// Each server render signs a new url for the same file. Live updates re-render the page: keeping the first url
// stops the media from reloading mid-playback. A new version remounts the player (key) and takes its own url.
// Once the kept url expires (1 h) the media fails to load: it then switches to the latest url the page received.
function useStableSrc(src: string) {
  const [stableSrc, setStableSrc] = useState(src);
  // false when there is no fresher url to try: the error is not an expiry
  const renew = () => {
    if (stableSrc === src) return false;
    setStableSrc(src);
    return true;
  };
  return [stableSrc, renew] as const;
}

type MediaProps<T extends "video" | "img"> = Omit<ComponentProps<T>, "ref" | "src" | "onError"> & { src: string };

export function RushVideo({ src, ...props }: MediaProps<"video">) {
  const videoRef = use(PlayerContext);
  const [stableSrc, renew] = useStableSrc(src);
  const resumeAt = useRef<number | null>(null);

  return (
    <video
      ref={videoRef}
      src={stableSrc}
      onError={(event) => {
        const time = event.currentTarget.currentTime;
        if (renew()) resumeAt.current = time;
      }}
      onLoadedMetadata={(event) => {
        if (resumeAt.current === null) return;
        event.currentTarget.currentTime = resumeAt.current;
        resumeAt.current = null;
      }}
      {...props}
    />
  );
}

export function RushImage({ src, alt, ...props }: MediaProps<"img"> & { alt: string }) {
  const [stableSrc, renew] = useStableSrc(src);
  // eslint-disable-next-line @next/next/no-img-element -- a signed url expires: nothing to optimize or cache
  return <img src={stableSrc} alt={alt} onError={() => renew()} {...props} />;
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
