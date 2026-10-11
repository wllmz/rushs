import { render } from "@testing-library/react";
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
});
