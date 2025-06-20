import { createSignal } from "solid-js";

export default function App() {
  const [prompt, setPrompt] = createSignal("");
  const [tweet, setTweet] = createSignal("");
  const [history, setHistory] = createSignal([]);

  const generateTweet = () => {
    if (!prompt()) return;
    const fake = `Here's a tweet about: ${prompt()}`;
    setTweet(fake);
    setHistory([{ text: fake, topic: prompt(), posted: false }, ...history()]);
    setPrompt("");
  };

  const postTweet = (index) => {
    const updated = history().map((item, i) =>
      i === index ? { ...item, posted: true } : item
    );
    setHistory(updated);
  };

  return (
    <div class="min-h-screen bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-gray-100 transition-all duration-300">
      <div class="max-w-3xl mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold text-center mb-6">
          🤖 <span class="text-indigo-600 dark:text-indigo-400">AI Tweet Generator</span>
        </h1>

        <div class="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-6 mb-6">
          <textarea
            class="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 dark:text-white"
            rows="3"
            placeholder="Enter a topic like 'React', 'AI', etc."
            value={prompt()}
            onInput={(e) => setPrompt(e.target.value)}
          />

          <button
            class="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition"
            onClick={generateTweet}
          >
            ✨ Generate Tweet
          </button>
        </div>

        {tweet() && (
          <div class="mb-6">
            <h2 class="text-xl font-semibold text-indigo-600 mb-2">Latest Tweet</h2>
            <div class="bg-white dark:bg-gray-900 border border-indigo-300 dark:border-indigo-700 rounded-lg shadow p-4">
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
                <div class="bg-white dark:bg-gray-900 p-4 rounded-lg shadow border border-gray-300 dark:border-gray-700">
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
