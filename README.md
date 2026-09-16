# WikiMaster Addons

**WikiMaster Addons** is a browser extension that enhances your gaming experience on [Wiki-Masters](https://www.wiki-masters.com). It provides automated features to save you time and helps you track your stats.

## 🚀 Features

- **Auto-Opener ("Ouvrir Tout")**: Adds a smart button on the pack opening page (`/pulls`). A single click automatically opens all your packs in succession, saving you from clicking manually dozens of times.
- **Auto-Claim Achievements ("Tout réclamer")**: Adds a button on the achievements page (`/achievements`) that lets you claim all your unlocked achievements at once.
- **Smart Polling & Anti-Spam**: The script dynamically detects when elements appear on the screen (no fixed timeouts) for maximum execution speed. It also includes a safety pause (1.5s) after each pack to bypass the game's "Opening too fast" rate-limit error.
- **Integrated Logs**: Debug logs are integrated seamlessly into the game's settings page (`/settings`).
- **Debugging Console**: Integrated real-time log panel, hidden by default but toggleable with a single click, featuring a button to copy the entire debug output.
- **Volume Control**: Adds a volume slider in the settings page to precisely adjust the sound effects (pack opening) of the game.
- **Micro-transaction Blocker**: Toggle switch available in settings to automatically hide intrusive "WikiMasters PRO" banners and premium offers.

## 🛠 Installation

To install this extension on Google Chrome (or any Chromium-based browser):

1. Download or clone this repository to your computer.
2. Open your browser and go to the extensions page: `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right corner).
4. Click on **Load unpacked**.
5. Select the folder containing the extension files (`WikimasterAddons/extension/`).
6. You're all set! The extension icon will appear in your toolbar.

## 🎮 Usage

1. Go to the pack opening page on WikiMaster (`/pulls`).
2. A large green **"Ouvrir Tout"** (Open All) button will appear below your packs if you have at least one.
3. Click it and watch the script do the work! The button will display a loading animation while the extension handles everything.
4. To check the logs, go to the settings page (`/settings`).

## 👨‍💻 Tech Stack

- Modern HTML5 / CSS3 (Flexbox, CSS Variables, Native Animations)
- Vanilla JavaScript (ES6, MutationObserver)
- Chrome Extension API (`chrome.storage.local`, `content_scripts`)
