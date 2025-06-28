import { createSignal, onMount } from "solid-js"; // SolidJS hooks for reactivity
import "./index.css"; // TailwindCSS + custom styles
import "solid-js/web"; // Web-specific bindings

// Main component
export default function App() {
  // 🌟 State variables (SolidJS reactive signals)
  const [prompt, setPrompt] = createSignal("");              // user input topic
  const [tweet, setTweet] = createSignal("");                // generated tweet
  const [history, setHistory] = createSignal([]);            // tweet history
  const [loading, setLoading] = createSignal(false);         // loading indicator
  const [editing, setEditing] = createSignal(false);         // editing state toggle
  const [editedTweet, setEditedTweet] = createSignal("");    // editable tweet content
  const [includeHashtag, setIncludeHashtag] = createSignal(false); // toggle for hashtag
  const [includeEmoji, setIncludeEmoji] = createSignal(false);     // toggle for emoji

  // 🚀 Run once when the app loads
  onMount(() => {
    // 🌙 Enable dark mode if system prefers it
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", prefersDark);

    // 🔥 Warm-up the backend by making a dummy request
    // This reduces latency on the first real request
    fetch(`${import.meta.env.VITE_BACKEND_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Hello world", hashtag: false, emoji: false }),
    }).catch(() => {}); // Ignore error
  });

  // ✨ Generate tweet from backend
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

      // Save tweet to state and history
      setTweet(tweetText);
      setHistory([{ text: tweetText, topic: prompt(), posted: false }, ...history()]);
      setPrompt(""); // clear input field
    } catch (error) {
      alert("Error generating tweet: " + error.message);
    } finally {
      setLoading(false); // stop loading spinner
    }
  };

  // 📨 Post tweet to Twitter Clone backend
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

      // Mark tweet as posted in history list
      const updated = history().map((item, i) =>
        i === index ? { ...item, posted: true } : item
      );
      setHistory(updated);
    } catch (error) {
      alert("Tweet post failed: " + error.message);
    }
  };

  // 🖼️ UI Structure
  return (
    <div class="min-h-screen bg-gradient-to-tr from-gray-950 to-gray-900 text-white font-sans">
      <div class="max-w-3xl mx-auto px-6 py-14">
        {/* 🧠 App Title */}
        <header class="flex justify-between items-center mb-10">
          <h1 class="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-transparent bg-clip-text animate-pulse">
            AI Tweet Studio 🚀
          </h1>
        </header>

        {/* 📝 Prompt Input Section */}
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

          {/* ⚙️ Options: Include hashtag and emoji */}
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

          {/* ✨ Generate Tweet Button */}
          <button
            class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
            onClick={generateTweet}
            disabled={loading()}
          >
            {loading() ? "✨ Generating..." : "🚀 Generate Tweet"}
          </button>
        </section>

        {/* 📢 Generated Tweet Section */}
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

              {/* 🛠️ Tweet Controls */}
              <div class="flex justify-end gap-4 mt-4 text-sm">
                <button onClick={() => navigator.clipboard.writeText(tweet())} class="text-indigo-300 hover:underline">📋 Copy</button>
                {editing() ? (
                  <>
                    <button class="text-green-400 hover:underline" onClick={() => {
                      setTweet(editedTweet());
                      const updated = history().map((item, i) =>
                        i === 0 ? { ...item, text: editedTweet() } : item
                      );
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

        {/* 🕓 Tweet History Section */}
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
