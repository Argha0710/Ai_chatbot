import { createSignal, onMount } from "solid-js";
import "./index.css";
import "solid-js/web";

export default function App() {
  const [prompt, setPrompt] = createSignal("");
  const [tweet, setTweet] = createSignal("");
  const [history, setHistory] = createSignal([]);
  const [darkMode, setDarkMode] = createSignal(false);

  // Ensure theme is set on mount and when darkMode changes
  onMount(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  });

 const generateTweet = async () => {
  if (!prompt()) return;

  setTweet("Generating...");
  try {
    const response = await fetch("http://127.0.0.1:8000/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: prompt() }),
    });

    const data = await response.json();
    setTweet(data.result);
    setHistory([{ text: data.result, topic: prompt(), posted: false }, ...history()]);
  } catch (error) {
    console.error("Error generating tweet:", error);
    setTweet("⚠️ Failed to generate tweet.");
  } finally {
    setPrompt("");
  }
};

  const postTweet = (index) => {
    const updated = history().map((item, i) =>
      i === index ? { ...item, posted: true } : item
    );
    setHistory(updated);
  };

  return (
    <div class="min-h-screen transition-all duration-300 transition-colors duration-500 ease-in-out
      bg-white text-black 
      dark:bg-gray-900 dark:text-white">

      <div class="max-w-3xl mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold text-center mb-6">
           <span class="text-indigo-600 dark:text-indigo-400">Tweet Ai</span>
        </h1>
        <div class="flex justify-end mb-4">
          <button
            class="bg-gray-200 dark:bg-gray-700 text-sm px-4 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            onClick={() => {
              const isDark = !darkMode();
              setDarkMode(isDark);
              document.documentElement.classList.toggle("dark", isDark);
              localStorage.setItem("theme", isDark ? "dark" : "light");
            }}
          >
            {darkMode() ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>
        </div>


        <div class="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">

          <textarea
            class="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 dark:text-white"
            rows="3"
            placeholder="Enter a topic like 'React', 'AI', etc."
            value={prompt()}
            onInput={(e) => setPrompt(e.target.value)}
          />

          <button
           class="mt-4 w-full bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition py-2 px-4 rounded-lg"
            onClick={generateTweet}
          >  
             Generate Tweet
          </button>
        </div>

        {tweet() && (
          <div class="mb-6">
            <h2 class="text-xl font-semibold text-indigo-600 mb-2">Latest Tweet</h2>
            <div class="bg-white dark:bg-gray-900 border border-indigo-300 dark:border-indigo-700 rounded-lg shadow p-4 text-gray-800 dark:text-gray-100">
              <p class="mb-2">{tweet()}</p>
              <button
                class="text-sm text-blue-500 hover:underline"
                onClick={() => navigator.clipboard.writeText(tweet())}
              >
                📋 Copy
              </button>
            </div>
          </div>
        )}

        {history().length > 0 && (
          <>
            <h2 class="text-2xl font-semibold mb-4 text-indigo-600">🧾 Generated Tweets</h2>
            <div class="space-y-4">
              {history().map((item, index) => (
                <div class="bg-white dark:bg-gray-900 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                  <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">{item.text}</p>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500 dark:text-gray-400 italic">Topic: {item.topic}</span>
                    {item.posted ? (
                      <span class="text-green-600 font-semibold">✅ Posted</span>
                    ) : (
                      <button
                        class="text-green-600 hover:underline"
                        onClick={() => postTweet(index)}
                      >
                        🐦 Post to Twitter
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
