// Scene modules are code-split and only fetched when their section approaches.
export interface SceneHandle {
  stage: { renderNow: (t?: number) => void; invalidate: () => void };
  setProgress?: (p: number) => void;
  dispose: () => void;
}
export type SceneFactory = (canvas: HTMLCanvasElement, onReady: () => void, opts?: { still?: boolean; variant?: number }) => SceneHandle;

export const SCENES: Record<string, () => Promise<SceneFactory>> = {
  kardashev: async () => (await import("./scenes/kardashev")).createKardashevScene,
  sun: async () => (await import("./scenes/sunSurface")).createSunSurfaceScene,
  hero: async () => (await import("./scenes/hero")).createHeroScene,
  output: async () => (await import("./scenes/output")).createOutputScene,
  factory: async () => (await import("./scenes/factory")).createFactoryScene,
  space: async () => (await import("./scenes/space")).createSpaceScene,
  mass: async () => (await import("./scenes/mass")).createMassScene,
  chip: async () => (await import("./scenes/chip")).createChipScene,
};
