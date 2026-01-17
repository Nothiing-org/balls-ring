export type RevealMode = 'total' | 'delta';

export interface Day {
  dayIndex: number;
  followerCount: number;
  pixelsRevealed: number;
  frameDataUri?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  baseImage: string; // The original uploaded image data URI
  croppedImage: string; // The 1000x1000 cropped image data URI for processing
  shuffledPixelIndices: number[];
  revealMode: RevealMode;
  pixelsPerFollower: number;
  maxPixelsCap: number;
  randomSeed: number;
  days: Day[];
  createdAt: string;
}
