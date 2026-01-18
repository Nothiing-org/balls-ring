'use server';

/**
 * @fileOverview A flow for generating a project video.
 *
 * - generateProjectVideo - A function that handles the video generation process.
 * - GenerateProjectVideoInput - The input type for the generateProjectVideo function.
 * - GenerateProjectVideoOutput - The return type for the generateProjectVideo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import type { MediaPart } from 'genkit';

const GenerateProjectVideoInputSchema = z.object({
    croppedImageUri: z.string().describe("The cropped base image data URI."),
    projectName: z.string().describe("The name of the project."),
    revealMode: z.string().describe("The reveal mode of the project."),
});
export type GenerateProjectVideoInput = z.infer<typeof GenerateProjectVideoInputSchema>;

const GenerateProjectVideoOutputSchema = z.object({
    videoDataUri: z.string().describe('The generated video as a data URI.'),
});
export type GenerateProjectVideoOutput = z.infer<typeof GenerateProjectVideoOutputSchema>;

export async function generateProjectVideo(input: GenerateProjectVideoInput): Promise<GenerateProjectVideoOutput> {
    return generateProjectVideoFlow(input);
}

// Helper function to download the video from the signed URL provided by Veo
async function downloadVideo(video: MediaPart): Promise<string> {
    if (!video.media?.url) {
        throw new Error('Video URL not found');
    }
    const fetch = (await import('node-fetch')).default;
    // The URL returned by Veo is a pre-signed URL and should not require an additional API key.
    const videoDownloadResponse = await fetch(video.media.url);
    
    if (!videoDownloadResponse.ok || !videoDownloadResponse.body) {
        throw new Error(`Failed to download video: ${videoDownloadResponse.statusText}`);
    }

    const videoBuffer = await videoDownloadResponse.buffer();
    const contentType = video.media.contentType || 'video/mp4';

    return `data:${contentType};base64,${videoBuffer.toString('base64')}`;
}


const generateProjectVideoFlow = ai.defineFlow(
    {
        name: 'generateProjectVideoFlow',
        inputSchema: GenerateProjectVideoInputSchema,
        outputSchema: GenerateProjectVideoOutputSchema,
    },
    async (input) => {
        let promptText = '';
        if (input.revealMode === 'total' || input.revealMode === 'delta') {
            promptText = `Create a 10-second video montage celebrating the project "${input.projectName}". Start with a black screen. Gradually reveal the provided image in a random, pixelated fashion. The reveal should feel satisfying and build anticipation, ending with the full, clear image.`;
        } else {
            // As discussed, generating a video for the complex 'escape' simulation is not feasible.
            throw new Error('Video generation for "Escape Room" mode is not currently supported.');
        }

        let { operation } = await ai.generate({
            model: googleAI.model('veo-2.0-generate-001'),
            prompt: [
                { text: promptText },
                { media: { url: input.croppedImageUri } }
            ],
            config: {
                durationSeconds: 10,
                aspectRatio: '16:9',
            },
        });

        if (!operation) {
            throw new Error('Expected the model to return an operation');
        }

        // Poll for completion
        while (!operation.done) {
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s
            operation = await ai.checkOperation(operation);
        }

        if (operation.error) {
            throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        const video = operation.output?.message?.content.find((p) => !!p.media);
        if (!video) {
            throw new Error('Failed to find the generated video in the operation result');
        }

        const videoDataUri = await downloadVideo(video as MediaPart);

        return { videoDataUri };
    }
);
