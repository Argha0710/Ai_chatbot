import { createSignal } from "solid-js";

export default function App() {
  const [prompt, setPrompt] = createSignal("");
  const [tweet, setTweet] = createSignal("");

  const generateTweet = () => {
    const fakeTweet = `Here's a tweet about: ${prompt()}`;
    setTweet(fakeTweet);
  };

  return (
    <div class="min-h-screen bg-gray-100 p-6 flex flex-col items-center justify-center">
      <div class="w-full max-w-md space-y-4">
        <h1 class="text-2xl font-bold text-center text-blue-700">🧠 AI Tweet Generator</h1>

        <textarea
          rows="4"
          class="w-full border border-gray-300 rounded p-2"
          placeholder="Type a topic (e.g., AI and pizza)..."
          value={prompt()}
          onInput={(e) => setPrompt(e.target.value)}
        />

        <button
          class="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 transition"
          onClick={generateTweet}
        >
          Generate Tweet
        </button>

        {tweet() && (
          <div class="bg-white p-4 rounded shadow border mt-4">
            <p class="text-gray-800">{tweet()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
