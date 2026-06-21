# 🎮 Game-Box

> **Early Dev** · Powered by Limbo

A playful, installable **Progressive Web App (PWA)** game console — runs entirely in the browser, no server needed after installation.

---

## ✨ Features

- **PWA installable** — works on Android, iOS, and Desktop  
- **Non-PWA install tutorial** — shown automatically when opened in browser  
- **Persistent storage request** — keeps saves safe via `navigator.storage.persist()` + IndexedDB  
- **3-second loading screen** — animated progress bar  
- **First-start setup** — choose username, console name, and theme  
- **Dark / Light mode toggle** — animated sun/moon switch (by [Galahhad on Uiverse.io](https://uiverse.io/Galahhad))  
- **Game grid homescreen** — auto-loaded from `games/gamelist.json`  
- **In-game close button** — bottom-left ✕ with confirmation overlay  
- **Offline support** — via Service Worker caching  

---

## 📁 File Structure

```
Game-box/
├── index.html          — Main app shell (all screens)
├── style.css           — All styles + theme variables
├── app.js              — Boot logic, routing, IndexedDB
├── sw.js               — Service Worker (offline cache)
├── manifest.json       — PWA manifest
├── icons/
│   ├── icon-192.png    — PWA icon (required)
│   └── icon-512.png    — PWA icon large (required)
└── games/
    ├── gamelist.json   — Game registry
    └── demo/
        ├── index.html  — Demo game
        └── icon.svg    — Demo game icon
```

---

## 🎮 Adding Games

Edit `games/gamelist.json`:

```json
{
  "games": [
    {
      "index": 0,
      "name":  "My Game",
      "icon":  "games/my-game/icon.svg",
      "path":  "games/my-game/index.html"
    }
  ]
}
```

> **Important:** All paths in `gamelist.json` are relative to the **Game-Box root**, not the game folder. Inside your game's own HTML files, paths like `/images/x.png` are still resolved from the game file's own location inside its iframe — they work normally.

---

## 🚀 Deploy to GitHub Pages

1. Push all files to `main` branch of `Wolfiku/Game-box`  
2. Go to **Settings → Pages → Source: Deploy from branch → main / root**  
3. Done — available at `https://wolfiku.github.io/Game-box/`

> The `start_url` and Service Worker cache paths are already set to `/Game-box/`.

---

## 🖼️ Icons

Generate icons at [favicon.io](https://favicon.io/favicon-generator/) and save as:  
- `icons/icon-192.png` (192×192)  
- `icons/icon-512.png` (512×512)

---

## 📖 Credits

See [CREDITS.md](CREDITS.md).
