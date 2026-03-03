# Chris AI

Welcome to **Chris AI**, a highly professional, premium AI chat platform inspired by Grok's sleek, dark-mode interface. Built with Next.js, Tailwind CSS, and powered by the Gemini API.

## 🚀 Features

- **Premium UI/UX**: Pure black dark mode (`#000000`), glassmorphism effects (`backdrop-blur-3xl`), and smooth auto-resizing inputs.
- **Multimodal Capabilities**: Upload Images, PDFs, and Text files directly into the chat context.
- **Voice Dictation**: Integrated Web Speech API for real-time voice-to-text input.
- **Think Mode**: Forces the AI to explain its thought process step-by-step for complex reasoning tasks.
- **DeepSearch Mode**: Integrates Google Search grounding to provide up-to-date information with clickable source links.
- **Prompt Enhancement**: One-click prompt optimization using Gemini.
- **Advanced Error Handling**: Custom, non-intrusive toast notifications mapped to specific HTTP and API finish reasons.

## 🛠️ Installation

1. **Create a new Next.js project**:
   ```bash
   npx create-next-app@latest chris-ai
   cd chris-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install lucide-react
   ```

3. **Copy the project files**:
   - Replace the contents of `app/page.jsx` (or `.tsx`) with the provided code.
   - Update your `tailwind.config.js` and `package.json` as provided.

## 🔑 Configuration

To use Chris AI, you need a Gemini API key:

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key** and create a new key.
3. Open `app/page.jsx` and locate the `apiKey` variable at the top of the component:
   ```javascript
   const apiKey = "YOUR_GEMINI_API_KEY_HERE";
   ```
   *(For production, it is highly recommended to move this to a `.env.local` file and use `process.env.NEXT_PUBLIC_GEMINI_API_KEY`)*.

## 🏃‍♂️ Running the App

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to explore the universe with Chris AI.
