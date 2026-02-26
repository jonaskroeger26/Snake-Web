# 🎧 Music Player Skins

> A nostalgic, interactive music player built with modern web technologies — featuring beautifully recreated **classic device UIs** like the iPod Classic, iPod Nano, Nokia 3310, and Sony Walkman.

🌐 **Live Project:** [music.sidhyatikku.com](https://music.sidhyatikku.com)  
👨‍💻 **Portfolio:** [sidhyatikku.com](https://sidhyatikku.com)  
🐦 **Connect on X:** [@sidhyatikku](https://x.com/sidhyatikku)

---

## 🪩 Overview

Step back into the golden era of portable music players — now in your browser.  
This project brings together design nostalgia and web performance with a **Next.js + Tailwind** setup, powered by **Vercel v0** for seamless deployment.

🎵 Choose between multiple iconic skins  
💿 Browse artists, albums, and songs  
📱 Fully responsive + optimized for mobile  
🎚️ Smooth animations + working audio player  
💻 Built entirely in React, TypeScript, and Tailwind CSS, leveraging v0

---

## 🧱 Tech Stack

| Category | Technology |
|-----------|-------------|
| Framework | [Next.js 14](https://nextjs.org) |
| UI Library | [React 18](https://react.dev) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Components | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://www.radix-ui.com) |
| Icons | [Lucide React](https://lucide.dev) |
| Deployment | [Vercel](https://vercel.com) |

---

## ⚙️ Getting Started

### 🔑 Prerequisites
- [Node.js](https://nodejs.org) 18.x or higher  
- npm or yarn package manager

### 🧩 Installation

1. **Fork this repository**
   \`\`\`bash
   Click the "Fork" button on top-right of this page
   \`\`\`

2. **Clone your fork**
   \`\`\`bash
   git clone https://github.com/YOUR_USERNAME/music-player-skin.git
   cd music-player-skin
   \`\`\`

3. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

4. **Run the development server**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

5. **Open your browser**
   Visit [http://localhost:3000](http://localhost:3000) 🎧

---

## 📱 Build Android APK

You can get an installable Android APK in two ways:

### Option A: Expo EAS Build (online, like Snake app)

No local Java or Android Studio. Build in the cloud on Expo’s servers.

```bash
cd expo-app
npm install
npx eas login          # once: Expo account
npx eas build:configure   # once: link/create EAS project
npx eas build -p android --profile production
```

When the build finishes, download the APK from the link in the terminal or from [expo.dev](https://expo.dev) → your project → Builds. The app loads [SolanaPod](https://solana-pod.vercel.app/) in a WebView.

See **[expo-app/README.md](expo-app/README.md)** for details.

### Option B: GitHub Actions or local Capacitor

- **GitHub Actions:** Push to `main`; the workflow builds the APK. Download it from the repo’s **Actions** tab → latest run → **Artifacts** (solanapod-debug-apk).
- **Local:** Install Java 17 + Android Studio, then run `npm run android` from the repo root (builds Next.js + Capacitor and opens Android Studio). The Capacitor build supports **background audio** (Spotify-style) when the app is in the background.

---

## 📁 Project Structure

\`\`\`
music-player-skin/
├── app/                 # Next.js app directory
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Main entry point
│   └── globals.css      # Global styles
├── expo-app/            # Expo WebView shell for EAS Build (Android APK)
├── components/          # Device components + UI elements
│   ├── device-carousel.tsx
│   ├── ipod-classic.tsx
│   ├── ipod-nano-6.tsx
│   ├── nokia-3310.tsx
│   ├── sony-walkman-nw-a1000.tsx
│   └── ui/              # Shared UI components
├── contexts/            # React context (music playback, etc.)
├── lib/                 # Music library data + types
├── public/              # Static assets (album art, icons, etc.)
└── scripts/             # Node/JS utility scripts
\`\`\`

---

## 🚀 Deployment

This project is **auto-deployed** via [Vercel](https://vercel.com).  
Every commit pushed to `main` triggers a new deployment.  

🪄 **Live Demo:** [music.sidhyatikku.com](https://music.sidhyatikku.com)

Want your own?  
Click below to instantly deploy your own fork 👇  

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sidhyatikku/music-player-skin)

---

## 🤝 Contributing

Pull Requests are welcome!  
If you have ideas for new device skins, animations, or improvements — fork the repo, make your changes, and submit a PR.  
Let’s bring more retro music joy to the web 🎶

---

## 🧠 Troubleshooting & Support

If something’s not working right or you have questions:
- Open an **issue** on GitHub  
- Or reach out directly via [sidhyatikku.com](https://sidhyatikku.com)  

I’m always happy to help or collaborate 💬

---

## 📜 License

This project is open-source and available under the **GNU General Public License v3.0**.  

---

### ⭐️ If you like this project...
Give it a **star** on GitHub to show your support!  
It helps others discover it and keeps the nostalgia alive 💫
