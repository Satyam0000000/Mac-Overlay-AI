# MacOverlay AI

A lightweight macOS AI assistant overlay built with Electron and the OpenAI API.

MacOverlay AI stays available above other apps, so you can quickly ask questions or analyze screenshots without switching to a browser.

## Features

- Always-on-top transparent macOS overlay
- Global shortcuts to show or hide the app
- Text-based AI chat
- Image upload and pasted screenshot support
- OpenAI Responses API integration
- Local API-key storage using macOS Keychain-backed encryption
- Sandboxed renderer and limited IPC bridge for safer desktop architecture

## Tech Stack

- Electron
- JavaScript / Node.js
- HTML and CSS
- OpenAI Node.js SDK
- macOS Keychain via Electron `safeStorage`

## How It Works

```text
User input → Electron UI → Secure IPC bridge → Main process
→ OpenAI API → Response displayed in overlay
```

## Requirements

- macOS (the overlay and its secure API-key storage use macOS-specific Electron features)
- [Node.js](https://nodejs.org/) 18 or later, including npm
- An OpenAI API key

## Installation

Clone the repository and enter the project directory:

```bash
git clone <repository-url>
cd Mac-Overlay-AI
```

Install the exact package versions recorded in `package-lock.json`:

```bash
npm ci
```

If you are developing without the lockfile, use this instead:

```bash
npm install
```

## Start the App

From the project directory, run:

```bash
npm start
```

This opens the Electron overlay. Keep that Terminal window open while the app is running; press `Control + C` there to stop it.

## First-Time Setup

1. Open the overlay after starting the app.
2. Go to **Settings** and enter your OpenAI API key (it must begin with `sk-`).
3. Save the key, then return to chat and send a message or add an image.

The key is encrypted and stored locally for the current macOS user via Electron's `safeStorage` and the macOS Keychain.

## Keyboard Shortcuts

- `Option + L` — show or hide the overlay
- `Command + Shift + K` — show or hide the overlay
