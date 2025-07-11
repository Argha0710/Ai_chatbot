import { createSignal, onMount } from "solid-js";
import "./index.css";
import "solid-js/web";

export default function App() {
  const [prompt, setPrompt] = createSignal("");
  const [history, setHistory] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [includeHashtag, setIncludeHashtag] = createSignal(false);
  const [includeEmoji, setIncludeEmoji] = createSignal(false);
  const [generateImage, setGenerateImage] = createSignal(false);
  const [temperature, setTemperature] = createSignal("balanced");
  const [editingText, setEditingText] = createSignal("");

  onMount(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", prefersDark);
  });

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
          temperature: temperature()
        }),
      });
    
      if (!response.ok) throw new Error("Tweet generation failed");
      const data = await response.json();
      const tweetText = data.result;

      let imageUrl = "";
      if (generateImage()) {
        const imageRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate_image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // body: JSON.stringify({ prompt: prompt() }),
          body: JSON.stringify({ prompt: tweetText }),
        });
        if (imageRes.ok) {
          const imgData = await imageRes.json();
          imageUrl = imgData.image_url;
        }
      }

      setHistory([
        {
          prompt: prompt(),
          text: tweetText,
          image: imageUrl,
          posted: false,
          editing: false,
        },
        ...history(),
      ]);
      setPrompt("");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const regenerateImage = async (index) => {
    const item = history()[index];
    const imageRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate_image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: item.prompt }),
    });

    if (imageRes.ok) {
      const imgData = await imageRes.json();
      const updated = history().map((h, i) =>
        i === index ? { ...h, image: imgData.image_url } : h
      );
      setHistory(updated);
    }
  };

  const postTweet = async (index) => {
    const tweet = history()[index];
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/post_tweet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": import.meta.env.VITE_TWITTER_CLONE_API_KEY,
      },
      body: JSON.stringify({
        username: "argha",
        text: tweet.text,
        image: tweet.image || null,
      }),
    });

    if (response.ok) {
      const updated = history().map((h, i) =>
        i === index ? { ...h, posted: true } : h
      );
      setHistory(updated);
    } else {
      alert("Tweet failed");
    }
  };

  const updateEditedTweet = (index, newText) => {
    const updated = history().map((h, i) =>
      i === index ? { ...h, text: newText, editing: false, posted: false } : h
    );
    setHistory(updated);
  };

  return (
    <div class="min-h-screen bg-gradient-to-tr from-gray-950 to-gray-900 text-white font-sans">
      <div class="max-w-3xl mx-auto px-4 py-10">
        <h1 class="text-4xl font-bold text-center mb-10 bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
          AI Tweet Studio 🚀
        </h1>

        <div class="bg-gray-900/80 p-6 rounded-2xl shadow-xl border border-indigo-500/30 mb-8">
          <textarea
            class="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows="3"
            placeholder="Write a topic..."
            value={prompt()}
            onInput={(e) => setPrompt(e.target.value)}
          />
          <div class="flex flex-wrap gap-4 mt-4 text-sm text-indigo-200">
            <label class="flex items-center gap-2">
              <input type="checkbox" checked={includeHashtag()} onChange={(e) => setIncludeHashtag(e.target.checked)} />
              Hashtags
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" checked={includeEmoji()} onChange={(e) => setIncludeEmoji(e.target.checked)} />
              Emojis
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" checked={generateImage()} onChange={(e) => setGenerateImage(e.target.checked)} />
              Generate Image
            </label>
            <label class="flex items-center gap-2">
              Temperature:
              <select
                value={temperature()}
                onInput={(e) => setTemperature(e.currentTarget.value)}
                class="bg-gray-800 border border-gray-600 p-1 rounded"
              >
                <option value="precise">Precise</option>
                <option value="balanced">Balanced</option>
                <option value="creative">Creative</option>
                <option value="wild">Wild</option>
              </select>
            </label>
          </div>
          <button
            onClick={generateTweet}
            disabled={loading()}
            class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl shadow-lg disabled:opacity-50"
          >
            {loading() ? "✨ Generating..." : "🚀 Generate Tweet"}
          </button>
        </div>

        <div class="space-y-8">
          {history().map((item, index) => (
            <div class="flex flex-col gap-4 w-full" key={index}>
              <div class="flex justify-start">
                <div class="bg-gray-800 p-4 rounded-xl w-full max-w-[90%]">
                  <p class="text-sm text-indigo-300">You:</p>
                  <p>{item.prompt}</p>
                </div>
              </div>

              <div class="flex justify-end">
                <div class="bg-gray-900 border border-indigo-500/30 p-4 rounded-xl w-full max-w-[90%]">
                  <p class="text-sm text-pink-400">AI:</p>
                  {item.editing ? (
                    <>
                      <textarea
                        ref={(el) => el?.focus()}
                        value={editingText()}
                        rows={3}
                        onInput={(e) => setEditingText(e.currentTarget.value)}
                        class="w-full p-2 rounded bg-gray-800 text-white border border-indigo-400 mt-1"
                      />
                      <div class="flex justify-end gap-4 mt-2 text-sm">
                        <button class="text-green-400 hover:underline" onClick={() => updateEditedTweet(index, editingText())}>💾 Save</button>
                        <button class="text-red-400 hover:underline" onClick={() => {
                          const updated = [...history()];
                          updated[index].editing = false;
                          setHistory(updated);
                        }}>❌ Cancel</button>
                      </div>
                    </>
                  ) : (
                    <p class="text-white mt-1">{item.text}</p>
                  )}

                  {item.image && (
                    <div class="mt-3">
                      <img src={item.image} alt="AI Visual" class="rounded-xl max-h-64" />
                      <button class="text-indigo-300 text-sm hover:underline mt-1" onClick={() => regenerateImage(index)}>🔁 Regenerate Image</button>
                    </div>
                  )}

                  <div class="flex justify-end gap-4 mt-3 text-sm">
                    <button onClick={() => navigator.clipboard.writeText(item.text)} class="text-indigo-300 hover:underline">📋 Copy</button>
                    <button class="text-yellow-400 hover:underline" onClick={() => {
                      const updated = [...history()];
                      updated[index].editing = true;
                      setEditingText(item.text);
                      setHistory(updated);
                    }}>✏️ Edit</button>
                    {item.posted ? (
                      <span class="text-green-400">✅ Posted</span>
                    ) : (
                      <button onClick={() => postTweet(index)} class="text-indigo-400 hover:underline">📤 Post</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
