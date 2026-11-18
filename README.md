# AppLock 10H — Chromebook PWA

## What it does
- Lets you record the name of an app you are making a commitment to keep installed.
- A removal request starts a 10-hour countdown.
- A parent PIN is required to approve the request after the countdown.
- Stores a local activity history and can export it as JSON.
- Can work offline after the first successful load.

## Important limitation
This app does **not** intercept or prevent ChromeOS/Android uninstall actions. After approval, a person must uninstall the Android app manually. The PWA is an accountability workflow only. Data is stored locally in this browser profile; clearing site data, changing browser storage, or modifying the source can bypass/reset it. Do not use it as a substitute for parental supervision or device-level controls.

## Run locally on Chromebook
1. Download and extract the ZIP.
2. Open the Linux Terminal on Chromebook (Settings → Developers → Linux development environment). If Linux is unavailable, use an HTTPS static host instead.
3. In Terminal, navigate to the extracted folder. Example:
   `cd ~/Downloads/applock10h`
4. Start a local web server:
   `python3 -m http.server 8000`
5. In Chrome, open:
   `http://localhost:8000`
6. Configure the parent PIN with your parent present. Ask them to enter a PIN they keep private.
7. Enter the app name and select **Save app**.
8. Select **Request removal** to start the 10-hour countdown.
9. After 10 hours, your parent opens **Parent approval**, enters the PIN, and approves if they agree.

## Install as a PWA
1. Keep the local server running and open `http://localhost:8000` in Chrome.
2. Open Chrome's three-dot menu.
3. Choose **Cast, save, and share** → **Install page as app** (wording may vary), or use the install icon in the address bar if shown.
4. Confirm installation. AppLock 10H should appear in the Launcher.

For installation that remains available without running the local server, deploy the folder to a trusted HTTPS static host. PWA installation and service workers require HTTPS or localhost.

## Parent PIN notes
The app hashes the PIN with a random salt using the browser's Web Crypto API. This is better than storing the PIN as plain text, but it is not strong device security: anyone with access to the browser profile and developer tools may change local data or code. The parent should keep the PIN private and supervise approval in person.

## Project files
- `index.html` — interface
- `styles.css` — design
- `app.js` — countdown, PIN hash, approval, history
- `manifest.webmanifest` — install metadata
- `sw.js` — offline cache
- `icon-192.png`, `icon-512.png` — app icons
