'use server';

/**
 * @fileOverview A flow for generating a daily frame that reveals pixels in an image based on follower count.
 *
 * - generateDailyFrame - A function that handles the daily frame generation process.
 * - GenerateDailyFrameInput - The input type for the generateDailyFrame function.
 * - GenerateDailyFrameOutput - The return type for the generateDailyFrame function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDailyFrameInputSchema = z.object({
  baseImageUri: z
    .string()
    .describe(
      'The base image as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected the typo here
    ),
  followerCount: z.number().describe('The current follower count.'),
  pixelsPerFollower: z.number().describe('The number of pixels to reveal per follower.'),
  maxPixelsCap: z.number().describe('The maximum number of pixels that can be revealed.'),
  randomSeed: z.number().describe('The random seed for deterministic pixel shuffling.'),
  dayIndex: z.number().describe('The day index for deterministic pixel shuffling.'),
  revealMode: z.enum(['total', 'delta']).describe('The reveal mode: total or delta.'),
  revealedPixelsFromPreviousDay: z.number().describe('The number of revealed pixels from previous day if revealMode is delta.'),
});

export type GenerateDailyFrameInput = z.infer<typeof GenerateDailyFrameInputSchema>;

const GenerateDailyFrameOutputSchema = z.object({
  frameDataUri: z.string().describe('The generated frame as a data URI.'),
  revealedPixelCount: z.number().describe('The number of pixels revealed in the current frame.'),
});

export type GenerateDailyFrameOutput = z.infer<typeof GenerateDailyFrameOutputSchema>;


export async function generateDailyFrame(input: GenerateDailyFrameInput): Promise<GenerateDailyFrameOutput> {
  return generateDailyFrameFlow(input);
}


const randomizePixelsTool = ai.defineTool({
  name: 'randomizePixels',
  description: 'Deterministically randomizes the pixels to be revealed based on the project seed and day index.',
  inputSchema: z.object({
    imageWidth: z.number().describe('The width of the image.'),
    imageHeight: z.number().describe('The height of the image.'),
    pixelCountToReveal: z.number().describe('The number of pixels to reveal.'),
    randomSeed: z.number().describe('The random seed for deterministic shuffling.'),
    dayIndex: z.number().describe('The day index for deterministic shuffling.'),
  }),
  outputSchema: z.array(z.number()).describe('An array of pixel indices to reveal.'),
}, async (input) => {
  const {
    imageWidth,
    imageHeight,
    pixelCountToReveal,
    randomSeed,
    dayIndex,
  } = input;

  const totalPixels = imageWidth * imageHeight;
  const pixelIndices = Array.from(Array(totalPixels).keys());

  // Create a deterministic random number generator based on seed and day index.
  const seededRandom = mulberry32(randomSeed + dayIndex); // Use mulberry32 as a psuedo random number generator

  // Shuffle the pixel indices using Fisher-Yates shuffle with the deterministic random number generator.
  for (let i = totalPixels - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [pixelIndices[i], pixelIndices[j]] = [pixelIndices[j], pixelIndices[i]];
  }

  // Return the first pixelCountToReveal indices.
  return pixelIndices.slice(0, pixelCountToReveal);
});

// Mulberry32 psuedo random number generator
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}


const generateDailyFramePrompt = ai.definePrompt({
  name: 'generateDailyFramePrompt',
  tools: [randomizePixelsTool],
  input: {schema: GenerateDailyFrameInputSchema},
  output: {schema: GenerateDailyFrameOutputSchema},
  prompt: `You are an AI that generates a daily frame revealing pixels of a base image based on follower count.

  The current follower count is: {{{followerCount}}}.
  The number of pixels to reveal per follower is: {{{pixelsPerFollower}}}.
  The maximum number of pixels that can be revealed is: {{{maxPixelsCap}}}.
  The random seed is: {{{randomSeed}}}.
  This is day number: {{{dayIndex}}}.
  The reveal mode is: {{{revealMode}}}.
  The number of revealed pixels from previous day is: {{{revealedPixelsFromPreviousDay}}}.
  The base image is: {{media url=baseImageUri}}
  
  First, determine the total number of pixels to reveal for the current day. 
  If the reveal mode is "total", calculate the total pixels to reveal by multiplying the follower count by the pixels per follower, and cap it at the maxPixelsCap. 
  If the reveal mode is "delta", calculate the additional pixels to reveal by multiplying the difference between the current follower count and previous follower count with the pixels per follower. Then add this difference to the revealedPixelsFromPreviousDay. 
  If the calculated total revealed pixels exceed maxPixelsCap, then cap it at maxPixelsCap.

  Then, call the randomizePixels tool to get a list of pixel indices to reveal. 
  The randomizePixels tool parameters should be imageWidth: 1000, imageHeight: 1000, pixelCountToReveal, randomSeed, and dayIndex.

  Finally, generate a new image frame with the revealed pixels and return the frame as a data URI, along with the total number of revealed pixels.
  Ensure the outputted frame data uri follows the format 'data:<mimetype>;base64,<encoded_data>'.

  Important:
  - The final frameDataUri must be a valid data URI representing a PNG image.
  - The revealedPixelCount must be an integer number.
  - Adhere to the data URI and revealedPixelCount formats strictly. No exceptions are allowed.

  Output:
  \{ 
    frameDataUri: <data URI of the generated frame>,
    revealedPixelCount: <total number of revealed pixels>
  \}
  `,
});


const generateDailyFrameFlow = ai.defineFlow(
  {
    name: 'generateDailyFrameFlow',
    inputSchema: GenerateDailyFrameInputSchema,
    outputSchema: GenerateDailyFrameOutputSchema,
  },
  async input => {
    let pixelsToReveal = 0;
    if (input.revealMode === 'total') {
      pixelsToReveal = Math.min(input.followerCount * input.pixelsPerFollower, input.maxPixelsCap);
    } else {
      pixelsToReveal = Math.min(input.revealedPixelsFromPreviousDay + ((input.followerCount ) * input.pixelsPerFollower), input.maxPixelsCap);
    }

    const promptInput = {
      ...input,
    };

    const {output} = await generateDailyFramePrompt(promptInput);
    return output!;
  }
);
