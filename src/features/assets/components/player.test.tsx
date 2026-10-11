import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerProvider, RushImage, RushVideo } from "./player";

describe("RushVideo and RushImage", () => {
  it("keep their first signed url when the page re-renders with a new one", () => {
    const { container, rerender } = render(
      <PlayerProvider>
        <RushVideo src="https://storage/v1.mp4?token=first" />
        <RushImage src="https://storage/v1.png?token=first" alt="Plan" />
      </PlayerProvider>,
    );

    rerender(
      <PlayerProvider>
        <RushVideo src="https://storage/v1.mp4?token=second" />
        <RushImage src="https://storage/v1.png?token=second" alt="Plan" />
      </PlayerProvider>,
    );

    expect(container.querySelector("video")).toHaveAttribute("src", "https://storage/v1.mp4?token=first");
    expect(container.querySelector("img")).toHaveAttribute("src", "https://storage/v1.png?token=first");
  });

  it("switch to the latest url once the kept one fails, and the video resumes where it was", () => {
    const tree = (src: string) => (
      <PlayerProvider>
        <RushVideo src={`https://storage/v1.mp4?token=${src}`} />
        <RushImage src={`https://storage/v1.png?token=${src}`} alt="Plan" />
      </PlayerProvider>
    );
    const { container, rerender } = render(tree("first"));
    rerender(tree("fresh"));
    const video = container.querySelector("video") as HTMLVideoElement;
    const image = container.querySelector("img") as HTMLImageElement;

    video.currentTime = 42;
    fireEvent.error(video);
    fireEvent.error(image);

    expect(video).toHaveAttribute("src", "https://storage/v1.mp4?token=fresh");
    expect(image).toHaveAttribute("src", "https://storage/v1.png?token=fresh");
    video.currentTime = 0;
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(42);
  });

  it("stay on their url when the error is not an expiry", () => {
    const { container } = render(
      <PlayerProvider>
        <RushVideo src="https://storage/v1.mp4?token=only" />
      </PlayerProvider>,
    );
    const video = container.querySelector("video") as HTMLVideoElement;

    fireEvent.error(video);

    expect(video).toHaveAttribute("src", "https://storage/v1.mp4?token=only");
  });
});
