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