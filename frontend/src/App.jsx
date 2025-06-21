import { createSignal, onMount, createEffect } from "solid-js";
import "./index.css";
import "solid-js/web";

export default function App() {
  const [prompt, setPrompt] = createSignal("");
  const [tweet, setTweet] = createSignal("");
  const [history, setHistory] = createSignal([]);
  const [darkMode, setDarkMode] = createSignal(false);

  onMount(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark";
    setDarkMode(isDark);
    // Immediately set the class on mount for first render
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  });

  // Always keep the HTML class in sync with darkMode
  createEffect(() => {
    // Keep in sync for subsequent toggles
    if (darkMode()) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  });

  const generateTweet = async () => {
  if (!prompt()) return;

  try {
   const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const response = await fetch(`${BACKEND_URL}/generate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ prompt: prompt() }),
});


    if (!response.ok) {
      throw new Error("Failed to generate tweet");
    }

    const data = await response.json();
    const tweetText = data.result;


    setTweet(tweetText);
    setHistory([{ text: tweetText, topic: prompt(), posted: false }, ...history()]);
    setPrompt("");
  } catch (error) {
    console.error("Error generating tweet:", error);
    alert("Something went wrong while generating the tweet.");
  }
};


  const postTweet = async (index) => {
  const tweetToPost = history()[index];
  // console.log("🧪 Using API Key:", import.meta.env.VITE_TWITTER_CLONE_API_KEY);


  try {
    const response = await fetch("https://twitterclone-server-2xz2.onrender.com/post_tweet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": import.meta.env.VITE_TWITTER_CLONE_API_KEY,
      },
      body: JSON.stringify({
        content: tweetToPost.text,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to post tweet");
    }

    // Mark tweet as posted ✅
    const updated = history().map((item, i) =>
      i === index ? { ...item, posted: true } : item
    );
    setHistory(updated);
  } catch (error) {
    console.error("Error posting tweet:", error);
    alert("Tweet post failed");
  }
};


  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500">
      <div class="max-w-2xl mx-auto px-4 py-10">
        <header class="flex items-center justify-between mb-8">
          <h1 class="text-3xl font-extrabold tracking-tight text-gray-800 dark:text-white flex items-center gap-2">
            <span class="inline-block bg-indigo-600 dark:bg-indigo-400 text-white dark:text-gray-900 rounded-full px-3 py-1 text-lg shadow-sm">
              AI Tweet Studio
            </span>
          </h1>
          <button
            aria-label="Toggle dark mode"
            class="transition-colors duration-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full p-2 shadow hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
            onClick={() => {
              const isDark = !darkMode();
              setDarkMode(isDark);
              localStorage.setItem("theme", isDark ? "dark" : "light");
            }}
          >
            <span class="text-xl">{darkMode() ? "🌙" : "☀️"}</span>
          </button>
        </header>

        <main>
          <section class="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 mb-8 p-6 transition-colors duration-500">
            <label
              for="tweet-topic"
              class="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-2"
            >
              What should your tweet be about?
            </label>
         
            <textarea
              id="tweet-topic"
              class="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              rows="3"
              placeholder="E.g. AI, productivity, web development..."
              value={prompt()}
              onInput={(e) => setPrompt(e.target.value)}
              aria-label="Tweet topic"
            />
            <button
              class="mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition py-2 px-4 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-indigo-400"
              onClick={generateTweet}
            >
              Generate Tweet
            </button>
          </section>

          {tweet() && (
            <section class="mb-8 animate-fade-in">
              <h2 class="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
                Your Generated Tweet
              </h2>
              <div class="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700 rounded-xl shadow p-4 flex items-center justify-between">
                <p class="text-gray-800 dark:text-gray-100 mr-4">{tweet()}</p>
                <button
                  class="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                  aria-label="Copy tweet"
                  onClick={() => navigator.clipboard.writeText(tweet())}
                >
                  📋 Copy
                </button>
              </div>
            </section>
          )}

          {history().length > 0 && (
            <section>
              <h2 class="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-4">
                Previous Tweets
              </h2>
              <ul class="space-y-4">
                {history().map((item, index) => (
                  <li class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow p-4 flex flex-col gap-2">
                    <span class="text-gray-700 dark:text-gray-200">
                      {item.text}
                    </span>
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-500 dark:text-gray-400 italic">
                        Topic: {item.topic}
                      </span>
                      {item.posted ? (
                        <span class="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                          ✅ Posted
                        </span>
                      ) : (
                        <button
                          class="text-green-600 dark:text-green-400 hover:underline"
                          onClick={() => postTweet(index)}
                        >
                          Post to Twitter
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

