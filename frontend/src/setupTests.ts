import "@testing-library/jest-dom";

// jsdom does not implement HTMLCanvasElement.getContext — stub it for the
// wave/burst canvas in useFishingDecision so the draw loop can mount.
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  arc: jest.fn(),
  stroke: jest.fn(),
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 0,
  globalAlpha: 1,
})) as unknown as HTMLCanvasElement["getContext"];

// jsdom does not implement Element.animate — required by sparkle particles
// spawned by useGlowCursor.
Element.prototype.animate = jest.fn(() => ({
  onfinish: null,
  cancel: jest.fn(),
})) as unknown as Element["animate"];

// No-op requestAnimationFrame so the canvas draw loop in useFishingDecision
// does not busy-loop inside the test environment.
global.requestAnimationFrame = (() => 0) as unknown as typeof requestAnimationFrame;
global.cancelAnimationFrame = (() => undefined) as unknown as typeof cancelAnimationFrame;
