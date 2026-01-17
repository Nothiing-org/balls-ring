# **App Name**: PixelReveal

## Core Features:

- Project Creation: Create a new project with a name, target platform, and resolution preset.
- Image Upload and Cropping: Upload a base image and crop it to fit the target platform's aspect ratio.
- Reveal Mode Selection: Choose between total followers or new followers as the reveal trigger.
- Pixel Reveal Calculation: Calculates the number of pixels to reveal based on follower count and pixels per follower setting.
- Random Seed Generation and Management: Generates a random seed automatically or allows users to define it for consistent results.
- Daily Frame Generation: Generates a new frame each day, revealing additional pixels based on the follower count and chosen settings, incorporating a tool that deterministically randomizes the pixels revealed based on the project seed and day index.
- Video Export with Overlay: Exports a short video with overlay text showing the day number, pixels revealed, and optional percentage.

## Style Guidelines:

- Primary color: Black (#000000) for a minimalist, system-like aesthetic, consistent with llumina's brand.
- Background color: White (#FFFFFF) to provide a clean and professional backdrop.
- Accent color: Zinc-500 (#71717A) is a secondary text color for labels and less important information. It provides contrast against the white background and the black primary text but doesn't distract from the main content.
- Font: 'Plus Jakarta Sans' (sans-serif) for a professional and modern feel.
- Use tight leading (0.9) for big headings and wide tracking (0.2em to 0.4em) for small labels.
- Design a creator-friendly UI with a minimal, system-like appearance, and use the premium-card style to lay out the projects.
- Subtle entrance animation (smooth entrance from the bottom).