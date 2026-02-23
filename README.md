# Thai Learning Platform

A modern, mobile-friendly web application for learning Thai, built with **React + Vite**. It features interactive drag-and-drop exercises with sound playback, progress tracking, and a responsive glassmorphism UI.

## Features

- **Drag & Drop Exercises** – Match Thai sounds/images using `@dnd-kit` with full touch support
- **Lesson PDFs** – View lesson materials directly in the app
- **Progress Tracking** – Completed exercises are saved to `localStorage` and visually marked with ✅
- **Export / Import** – Share your progress as a Base64 code or URL hash (`#p=...`)
- **Configurable Exercise Descriptions** – Customize the instruction text for each exercise via `exercises.json`
- **Responsive Design** – Works on desktop and mobile with collapsible sidebar

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
├── exercises.json            # Exercise descriptions config
├── src/
│   ├── App.jsx               # Main app shell
│   ├── main.jsx              # Entry point
│   ├── index.css             # Global styles & design system
│   ├── assets/
│   │   └── content.json      # Scraped exercise data (units, pages, media URLs)
│   ├── components/
│   │   ├── DndExercise.jsx   # Drag-and-drop exercise component
│   │   └── Sidebar.jsx       # Navigation sidebar with progress UI
│   └── hooks/
│       └── useProgress.js    # Progress tracking hook (localStorage, URL hash, Base64)
├── scrape.mjs                # Node.js scraping script for content extraction
└── public/
```

## Configuring Exercise Descriptions

Edit `exercises.json` in the project root to customize the instruction text shown above each exercise:

```json
{
  "defaultDescription": "Match the sounds to the correct images.",
  "exercises": {
    "unit01/exc01/ex1.htm": {
      "description": "Listen to each sound and drag it to the matching Thai letter."
    },
    "unit02/exc01/ex1.htm": {}
  }
}
```

- **`defaultDescription`** – Fallback text used when no per-exercise description is set
- **`exercises`** – Map of exercise `path` → config object
  - Set `"description"` to override the default for a specific exercise
  - Leave the object empty `{}` to use the default

## Progress System

| Feature | How it works |
|---|---|
| **Auto-save** | Exercise path saved to `localStorage` on successful completion |
| **Visual feedback** | ✅ badges on exercises, per-unit progress bars, overall progress bar |
| **Export** | Base64-encoded progress code, copyable to clipboard |
| **Link sharing** | `#p=<base64>` appended to URL – opening the link restores progress |
| **Import** | Paste a progress code to merge with existing progress |
| **Reset** | Double-click confirm to clear all progress |

## Tech Stack

- **React 19** + **Vite 7**
- **@dnd-kit** for drag and drop
- **Lucide React** for icons
- **Vanilla CSS** with glassmorphism design system
