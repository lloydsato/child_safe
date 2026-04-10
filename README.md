# Child Guard App - Complete Setup & Deployment Guide

Welcome! This guide is written for complete beginners. Please follow these steps carefully to run the app on your computer or put it on the internet (deploy it).

---

## Part 1: Running the App on Your Computer (Local Setup)

### Step 1: Install Node.js
Before doing anything, your computer needs a software called Node.js to run the app.
1. Go to [https://nodejs.org/](https://nodejs.org/).
2. Download the version labeled **"LTS" (Long Term Support)** and install it like any other program. Keep clicking "Next" through with the default settings.

### Step 2: Unzip and Open the Folder
1. Right-click the `.zip` file you received and select **Extract All...** to unzip it into a folder.
2. Open that extracted folder.
3. Open a **Terminal** (or Command Prompt) inside this exact folder:
   - **Windows:** Click the address bar at the top of the file explorer, type `cmd`, and press Enter.
   - **Mac:** Right-click the folder, go to Services, and click "New Terminal at Folder".

### Step 3: Install the "Node Modules"
Because the app relies on internet packages that were deleted to make the zip file smaller, you have to download them again.
1. In the black terminal window you just opened, type the following command precisely, and press Enter:
   ```bash
   npm install
   ```
2. Wait a minute or two for it to finish installing all dependencies to a folder called `node_modules`.

### Step 4: Get an OpenRouter API Key
The AI features of this app require a free code (API key) from OpenRouter.
1. Go to [https://openrouter.ai/](https://openrouter.ai/) and click **Sign Up** (you can sign up with Google).
2. Once logged in, go to the **Keys** section from the menu.
3. Click **Create Key**. Give it any name (like "MyApp") and copy the long string of letters and numbers it gives you. **Keep this secret!**

### Step 5: Put the API Key in the App
1. In your app folder, make sure your computer is showing hidden "File Name Extensions".
2. Create a brand new text file and name it exactly `.env.local` (Yes, it starts with a dot, and there is no `.txt` at the end).
   *(If you already see a file named `.env.example`, you can just copy it, paste it, and rename it to `.env.local`)*.
3. Open `.env.local` using Notepad (or any text editor).
4. Inside the file, type this exactly, but replace "YOUR_KEY_HERE" with the key you just copied:
   ```env
   OPENROUTER_API_KEY=YOUR_KEY_HERE
   ```

   ```
   JWT_SECRET=some-random-string
   ```


   Add this as it is if not there

5. Save the file and close it.

### Step 6: Start the App!
1. Go back to your terminal window.
2. Type the following command and press Enter:
   ```bash
   npm run dev
   ```
3. It will give you a local web link (usually `http://localhost:5173`). Copy that link and paste it into your browser (Chrome/Edge/Safari). You are now using the app!

---

## Part 2: Putting the App on the Internet (Deployment)

If you want others to visit your website from their phones, you need to "host" it. The easiest free way without technical coding knowledge is using **GitHub** and **Railway**.

### Step 1: Upload the Code to GitHub
1. Go to [https://github.com/](https://github.com/) and create a free account.
2. Once logged in, click the **+** icon in the top right and select **New repository**.
3. Name it anything (e.g., `child-guard`). Scroll down and click **Create repository**.
4. On the next screen, look near the top for a link that says **"uploading an existing file"** and click it.
5. Drag and drop **all the files** from your unzipped app folder into this GitHub window.
   *(Note: Do not upload the `node_modules` folder. It's huge and unnecessary. GitHub usually ignores it automatically if you drop the whole folder, thanks to the `.gitignore` file).*
6. Wait for them to upload, scroll down, and click the green **Commit changes** button.

### Step 2: Connect it to Railway
1. Go to [https://railway.app/](https://railway.app/) and create an account by clicking **Login** -> **Login with GitHub**.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your GitHub repository (`child-guard`), and click **Deploy Now**.
4. Railway will start building your app. Wait! There's one more crucial step.

### Step 3: Add Your API Key on Railway
Railway doesn't know your secret OpenRouter API key yet.
1. Click on your newly added project box in Railway.
2. Go to the **Variables** tab at the top.
3. Click **New Variable** (or just type in the boxes).
4. Put `OPENROUTER_API_KEY` for the VARIABLE NAME.
5. Put your actual key for the VALUE.
6. Click **Add**.

### Step 4: Get Your Domain Link
1. Go to the **Settings** tab in Railway (while still clicking your project).
2. Scroll down to the **Networking** section.
3. Click **Generate Domain**.
4. Railway will give you a web link (something ending in `.up.railway.app`). Once the deployment turns green/successful, click this link!

Congratulations! Your app is now live on the internet! 🚀
