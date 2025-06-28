import { createSignal, onMount } from "solid-js";
import "./index.css";
import "solid-js/web";

export default function App() {
  const [prompt, setPrompt] = createSignal("");
  const [tweet, setTweet] = createSignal("");
  const [history, setHistory] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [editing, setEditing] = createSignal(false);
  const [editedTweet, setEditedTweet] = createSignal("");
  const [includeHashtag, setIncludeHashtag] = createSignal(false);
  const [includeEmoji, setIncludeEmoji] = createSignal(false);
  const [darkMode, setDarkMode] = createSignal(false); // ✅ Define darkMode state

  // 🌙 On mount: detect user's preferred color scheme and set dark mode
  onMount(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);

    // 🔥 Warm-up backend to reduce delay on first API call
    fetch(`${import.meta.env.VITE_BACKEND_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Hello world", hashtag: false, emoji: false }),
    }).catch(() => {});
  });

  // 🚀 Generate tweet from backend
  const generateTweet = async () => {
    if (!prompt()) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt(),
          hashtag: includeHashtag(),
          emoji: includeEmoji(),
        }),
      });
      if (!response.ok) throw new Error("Failed to generate tweet");
      const data = await response.json();
      const tweetText = data.result;
      setTweet(tweetText);
      setHistory([{ text: tweetText, topic: prompt(), posted: false }, ...history()]);
      setPrompt("");
    } catch (error) {
      alert("Error generating tweet: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 📤 Post tweet to Twitter Clone
  const postTweet = async (index) => {
    const tweetToPost = history()[index];
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/post_tweet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": import.meta.env.VITE_TWITTER_CLONE_API_KEY,
        },
        body: JSON.stringify({ username: "argha", text: tweetToPost.text }),
      });
      if (!response.ok) throw new Error("Failed to post tweet");
      const updated = history().map((item, i) =>
        i === index ? { ...item, posted: true } : item
      );
      setHistory(updated);
    } catch (error) {
      alert("Tweet post failed: " + error.message);
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-tr from-gray-950 to-gray-900 text-white font-sans">
      <div class="max-w-3xl mx-auto px-6 py-14">
        {/* 🔥 App Header */}
        <header class="flex justify-between items-center mb-10">
          <h1 class="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-transparent bg-clip-text animate-pulse">
            AI Tweet Studio 🚀
          </h1>
        </header>

        {/* ✍️ Tweet Input Area */}
        <section class="bg-gray-900/70 backdrop-blur-md border border-indigo-500/30 rounded-2xl shadow-2xl p-6">
          <label for="tweet-topic" class="block text-lg font-semibold mb-2 text-indigo-300">
            What should your tweet be about?
          </label>
          <textarea
            id="tweet-topic"
            class="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows="3"
            placeholder="E.g. AI, productivity, web development..."
            value={prompt()}
            onInput={(e) => setPrompt(e.target.value)}
          />

          <div class="flex flex-wrap gap-4 mt-4">
            <label class="flex items-center gap-2 text-sm text-indigo-200">
              <input type="checkbox" checked={includeHashtag()} onChange={(e) => setIncludeHashtag(e.target.checked)} />
              Include hashtag (#AI)
            </label>
            <label class="flex items-center gap-2 text-sm text-indigo-200">
              <input type="checkbox" checked={includeEmoji()} onChange={(e) => setIncludeEmoji(e.target.checked)} />
              Include emoji (🎯)
            </label>
          </div>

          <button
            class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
            onClick={generateTweet}
            disabled={loading()}
          >
            {loading() ? "✨ Generating..." : "🚀 Generate Tweet"}
          </button>
        </section>

        {/* 💬 Generated Tweet Display */}
        {tweet() && (
          <section class="mt-12 animate-fade-in">
            <h2 class="text-xl font-semibold mb-3 text-indigo-400">Generated Tweet</h2>
            <div class="bg-gradient-to-bl from-gray-800 via-gray-900 to-black border border-indigo-700 p-5 rounded-2xl shadow-xl">
              {editing() ? (
                <textarea
                  class="w-full p-3 rounded-xl bg-gray-800 text-white border border-indigo-500"
                  value={editedTweet()}
                  rows={3}
                  onInput={(e) => setEditedTweet(e.target.value)}
                />
              ) : (
                <p class="text-white text-lg">{tweet()}</p>
              )}
              <div class="flex justify-end gap-4 mt-4 text-sm">
                <button onClick={() => navigator.clipboard.writeText(tweet())} class="text-indigo-300 hover:underline">📋 Copy</button>
                {editing() ? (
                  <>
                    <button class="text-green-400 hover:underline" onClick={() => {
                      setTweet(editedTweet());
                      const updated = history().map((item, i) => i === 0 ? { ...item, text: editedTweet() } : item);
                      setHistory(updated);
                      setEditing(false);
                    }}>💾 Save</button>
                    <button class="text-red-400 hover:underline" onClick={() => setEditing(false)}>❌ Cancel</button>
                  </>
                ) : (
                  <button class="text-yellow-300 hover:underline" onClick={() => {
                    setEditedTweet(tweet());
                    setEditing(true);
                  }}>✏️ Edit</button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 📜 Tweet History */}
        {history().length > 0 && (
          <section class="mt-10">
            <h2 class="text-xl font-semibold mb-4 text-indigo-400">Tweet History</h2>
            <ul class="space-y-4">
              {history().map((item, index) => (
                <li class="bg-gray-800/90 border border-gray-700 p-4 rounded-2xl shadow-lg">
                  <p class="text-white">{item.text}</p>
                  <div class="flex justify-between text-sm text-indigo-300 mt-2">
                    <span>Topic: {item.topic}</span>
                    {item.posted ? (
                      <span class="text-green-400">✅ Posted</span>
                    ) : (
                      <button class="text-indigo-400 hover:underline" onClick={() => postTweet(index)}>
                        🔗 Post to Twitter
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
