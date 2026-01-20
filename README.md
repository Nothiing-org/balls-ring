# PixelReveal by llumina

This is a Next.js application built in Firebase Studio. It allows users to create projects where an image is revealed based on follower growth, with different modes for the reveal.

## Getting Started

To run the application locally:

1.  Install dependencies: `npm install`
2.  Run the development server: `npm run dev`

The app will be available at `http://localhost:9002`.

## How to Deploy Your Application

Your application is ready to be deployed to the web using **Firebase App Hosting**. The process is designed to be simple and automated.

### Step 1: Push Your Code to a GitHub Repository

Before you can deploy, your application's code must be in a GitHub repository.

1.  **Create a Repository:** Go to [GitHub.com](https://github.com), create a new repository.
2.  **Upload Your Files:** On the new repository's page, find the option to **uploading an existing file**. Drag and drop all of your project files and folders into the browser.
3.  **Commit Changes:** Add a commit message (e.g., "Initial commit") and save the files to your repository.

### Step 2: Connect to Firebase App Hosting

1.  **Open the Firebase Console:** Navigate to the [Firebase Console](https://console.firebase.google.com/).
2.  **Select Your Project:** Open your Firebase project, which is named **`studio-9883590042-3e8f8`**.
3.  **Go to App Hosting:** In the main menu on the left, find the "Build" section and click on **App Hosting**.
4.  **Connect Repository:** Follow the on-screen prompts to connect your GitHub account and select the repository you just created.

### Step 3: Automated Deployment

Once you've connected your repository, Firebase App Hosting will take over. It will:

-   Automatically detect that you have a Next.js application.
-   Build your code into a production-ready state.
-   Deploy it to a secure, public URL.

Your app will be live! From now on, every time you push a new commit to your repository's main branch, App Hosting will automatically rebuild and redeploy the latest version for you.
