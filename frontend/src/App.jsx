// ... Top imports
import { createSignal, onMount } from "solid-js";
import "./index.css";

export default function App() {
  const [prompt, setPrompt] = createSignal("");
  const [history, setHistory] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [includeHashtag, setIncludeHashtag] = createSignal(false);
  const [includeEmoji, setIncludeEmoji] = createSignal(false);
  const [generateImage, setGenerateImage] = createSignal(false);
  const [temperature, setTemperature] = createSignal("balanced");
  const [editingText, setEditingText] = createSignal("");
  const [isTyping, setIsTyping] = createSignal(false);

  let bottomRef;
  let chatContainer;

  onMount(() => {
    const restoreHistory = async () => {
      
      const localData = localStorage.getItem("chat_history");
      if (localData) {
        try {
          setHistory(JSON.parse(localData));
          queueMicrotask(() => scrollToBottom(false));
        } catch (err) {
          console.error("Failed to parse local chat history:", err);
        }
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/history`);
        const data = await res.json();

        const grouped = [];
        let current = null;

        await Promise.all(
          data.history.map(async (msg) => {
            if (msg.type === "human") {
              current = {
                prompt: msg.content,
                text: "",
                image: null,
                posted: false,
                editing: false,
                time: new Date((msg.timestamp || Date.now()) * 1000).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              };
            } else if ((msg.type === "ai" || msg.type === "image") && current) {
              if (msg.image_url || msg.image || msg.image_uuid) {
                if (msg.image_url || msg.image) {
                  current.image = msg.image_url || msg.image;
                } else if (msg.image_uuid) {
                  try {
                    const imageUrlRes = await fetch(
                      `${import.meta.env.VITE_BACKEND_URL}/image_url/${msg.image_uuid}`
                    );
                    const imageUrlData = await imageUrlRes.json();
                    if (imageUrlData.url) current.image = imageUrlData.url;
                  } catch (err) {
                    console.warn(`Failed to fetch image URL for uuid ${msg.image_uuid}`, err);
                  }
                }
                if (msg.image_uuid) current.image_uuid = msg.image_uuid;
              }

              if (msg.type === "ai") {
                current.text = msg.content || "";
              }

              grouped.push(current);
              current = null;
            }
          })
        );

        const resolvedHistory = await Promise.all(
          grouped.map(async (entry) => {
            if (!entry.image && entry.image_uuid) {
              try {
                const res = await fetch(
                  `${import.meta.env.VITE_BACKEND_URL}/image_url/${entry.image_uuid}`
                );
                const data = await res.json();
                if (data.url) entry.image = data.url;
              } catch (err) {
                console.warn("Failed to fetch image for uuid", entry.image_uuid, err);
              }
            }
            return entry;
          })
        );

        // ✅ Deduplicate based on prompts
  const dedupeKey = (entry) =>
          `${entry.prompt.trim().toLowerCase()}::${entry.text.trim().toLowerCase()}`;

        const existingSet = new Set((history() || []).map(dedupeKey));
        const newNonDuplicate = resolvedHistory.filter(
          (entry) => !existingSet.has(dedupeKey(entry))
        );
        if (nonDuplicate.length > 0) {
          const merged = [...history(), ...newNonDuplicate];
          setHistory(merged);
          localStorage.setItem("chat_history", JSON.stringify(merged));
        }

        queueMicrotask(() => scrollToBottom(false));
      } catch (err) {
        console.error("Failed to fetch backend history:", err);
      }
    };

    restoreHistory();
  });

  const scrollToBottom = (smooth = true) => {
    queueMicrotask(() =>
      bottomRef?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" })
    );
  };

  const preserveScroll = () => {
    if (!chatContainer) return null;
    return chatContainer.scrollHeight - chatContainer.scrollTop;
  };

  const restoreScroll = (prevOffset) => {
    if (!chatContainer || prevOffset == null) return;
    requestAnimationFrame(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight - prevOffset;
    });
  };

  const scrollSafeUpdate = (fn) => {
    const offset = preserveScroll();
    fn();
    restoreScroll(offset);
  };

  const getCurrentTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const clearChat = async () => {
    if (!confirm("Clear all chat history?")) return;
    setHistory([]);
    localStorage.removeItem("chat_history");
    await fetch(`${import.meta.env.VITE_BACKEND_URL}/clear_memory`, { method: "POST" });
  };

  const generateTweet = async () => {
    if (!prompt().trim()) return;
    setLoading(true);
    setIsTyping(true);
    const rawPrompt = prompt().trim();


const userPrompt = parsePrompt(rawPrompt);

    setPrompt("");

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          hashtag: includeHashtag(),
          emoji: includeEmoji(),
          temperature: temperature(),
        }),
      });

      if (!response.ok) throw new Error("Tweet generation failed");
      const data = await response.json();
      const tweetText = data.result;

        const newEntry = {
          prompt: userPrompt, // parsed prompt
          text: tweetText,
          image: generateImage() ? "loading" : "",
          image_uuid: null,
          posted: false,
          editing: false,
         time: getCurrentTime(),
       };
      const updatedHistory = [...history(), newEntry];
      setHistory(updatedHistory);
      localStorage.setItem("chat_history", JSON.stringify(updatedHistory));
      scrollToBottom();

      if (generateImage()) {
        const imageRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate_image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: tweetText }),
        });

        if (imageRes.ok) {
  const imgData = await imageRes.json();

  const lastIndex = updatedHistory.length - 1;
  const updatedEntry = {
    ...updatedHistory[lastIndex],
    image: imgData.image_url,
    image_uuid: imgData.uuid,
  };
  const newHistory = [...updatedHistory];
  newHistory[lastIndex] = updatedEntry;

  setHistory(newHistory);
  localStorage.setItem("chat_history", JSON.stringify(newHistory));
} else {
  const lastIndex = updatedHistory.length - 1;
  const updatedEntry = {
    ...updatedHistory[lastIndex],
    image: "",
  };
  const newHistory = [...updatedHistory];
  newHistory[lastIndex] = updatedEntry;

  setHistory(newHistory);
  localStorage.setItem("chat_history", JSON.stringify(newHistory));
}

scrollToBottom();
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

const regenerateImage = async (index) => {
  const offset = preserveScroll();
  const currentHistory = [...history()];
  
  // Set to "loading"
  currentHistory[index] = { ...currentHistory[index], image: "loading" };
  setHistory([...currentHistory]);
  restoreScroll(offset);

  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate_image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: currentHistory[index].text }),
    });

    const newOffset = preserveScroll();

    if (res.ok) {
      const imgData = await res.json();
      currentHistory[index] = {
        ...currentHistory[index],
        image: imgData.image_url,
        image_uuid: imgData.uuid,
      };
    } else {
      currentHistory[index].image = ""; // fallback
    }

    setHistory([...currentHistory]); // ✅ force update
    localStorage.setItem("chat_history", JSON.stringify(currentHistory));
    restoreScroll(newOffset);
  } catch (err) {
    console.error("Image regeneration failed:", err);
    currentHistory[index].image = "";
    setHistory([...currentHistory]); // ✅ force update
    localStorage.setItem("chat_history", JSON.stringify(currentHistory));
    restoreScroll(offset);
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
      localStorage.setItem("chat_history", JSON.stringify(updated));
    } else {
      alert("Tweet failed");
    }
  };

  const updateEditedTweet = (index, newText) => {
    scrollSafeUpdate(() => {
      const updated = history().map((h, i) =>
        i === index ? { ...h, text: newText, editing: false, posted: false } : h
      );
      setHistory(updated);
      localStorage.setItem("chat_history", JSON.stringify(updated));
    });
    scrollToBottom();
  };
  const parsePrompt = (input) => {
  let promptText = input;

  // Detect keywords
  const lowered = input.toLowerCase();
  if (lowered.includes("don't include hashtag")) setIncludeHashtag(false);
  if (lowered.includes("include hashtag")) setIncludeHashtag(true);
  if (lowered.includes("don't include emoji")) setIncludeEmoji(false);
  if (lowered.includes("include emoji")) setIncludeEmoji(true);

  // Remove instructions
   promptText = promptText.replace(/write a tweet about[:\-]*/i, "");
  promptText = promptText.replace(/don'?t include (hashtags?|emojis?)/gi, "");
  promptText = promptText.replace(/include (hashtags?|emojis?)/gi, "");
  promptText = promptText.replace(/dont include unnecessary statements/gi, "");
  return promptText.trim();

  
};


  return (
    <div class="min-h-screen bg-gradient-to-tr from-gray-950 to-gray-900 text-white font-sans flex flex-col">
      <div class="w-full px-4 pt-6">
        <h1 class="text-4xl font-bold mb-8 bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent text-center">
          AI Tweet Studio 🚀
        </h1>
      </div>

      <div
        ref={(el) => (chatContainer = el)}
        class="flex-1 overflow-y-auto px-4 w-full max-w-screen-lg mx-auto pb-40 min-h-[400px]"
      >
        {history().map((item, index) => (
          <div class="mb-6" key={index}>
            <div class="flex justify-end w-full">
              <div class="bg-gray-800 p-4 rounded-3xl max-w-[75%] ml-auto">
                <p class="text-sm text-indigo-300">You:</p>
                <p class="break-words whitespace-pre-wrap">{item.prompt}</p>
                <p class="text-xs text-gray-400 mt-1 text-right">{item.time}</p>
              </div>
            </div>

            <div class="flex justify-start w-full mt-2">
              <div class="bg-gray-900 border border-indigo-500/30 p-4 rounded-3xl w-full sm:max-w-[75%]">
                <p class="text-sm text-pink-400">AI:</p>

                {item.editing ? (
                  <>
                    <textarea
                      value={editingText()}
                      rows={4}
                      onInput={(e) => setEditingText(e.currentTarget.value)}
                      class="w-full p-3 mt-1 rounded-xl bg-gray-800 border border-indigo-400 text-white resize-none"
                    />
                    <div class="flex justify-end gap-4 mt-2 text-sm">
                      <button
                        class="text-green-400 hover:underline"
                        onClick={() => updateEditedTweet(index, editingText())}
                      >
                        💾 Save
                      </button>
                      <button
                        class="text-red-400 hover:underline"
                        onClick={() =>
                          scrollSafeUpdate(() => {
                            const updated = [...history()];
                            updated[index].editing = false;
                            setHistory(updated);
                          })
                        }
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <p class="text-white mt-1 whitespace-pre-wrap">{item.text}</p>
                )}

                {item.image === "loading" && (
                  <p class="mt-2 text-indigo-300 text-sm italic">Generating image...</p>
                )}

                {item.image && item.image !== "loading" && (
                  <>
                    <img src={item.image} class="mt-3 rounded-xl max-h-64" />
                    <button
                      onClick={() => regenerateImage(index)}
                      class="mt-2 text-sm text-yellow-300 hover:underline"
                    >
                      🔁 Regenerate Image
                    </button>
                  </>
                )}

                <div class="flex justify-end gap-4 mt-3 text-sm">
                  <button
                    onClick={() => navigator.clipboard.writeText(item.text)}
                    class="text-indigo-300 hover:underline"
                  >
                    📋 Copy
                  </button>
                  <button
                    class="text-yellow-400 hover:underline"
                    onClick={() =>
                      scrollSafeUpdate(() => {
                        const updated = [...history()];
                        updated[index].editing = true;
                        setEditingText(history()[index].text);
                        setHistory(updated);
                      })
                    }
                  >
                    ✏️ Edit
                  </button>

                  {item.posted ? (
                    <span class="text-green-400">✅ Posted</span>
                  ) : (
                    <button
                      onClick={() => postTweet(index)}
                      class="text-indigo-400 hover:underline"
                    >
                      📤 Post
                    </button>
                  )}
                </div>
                <p class="text-xs text-gray-400 mt-1">{item.time}</p>
              </div>
            </div>
          </div>
        ))}

        {isTyping() && (
          <div class="flex justify-start">
            <div class="bg-gray-900 text-white text-sm rounded-3xl px-4 py-2 animate-pulse">
              AI is typing...
            </div>
          </div>
        )}

        <div ref={(el) => (bottomRef = el)}></div>
        <div style="height: 80px;"></div>
      </div>

      <div class="fixed bottom-0 left-0 w-full bg-gray-900 border-t border-indigo-500/20 p-4 z-50 rounded-t-3xl shadow-xl">
        <div class="max-w-screen-lg mx-auto flex flex-col gap-3 bg-gray-800 rounded-3xl p-4">
          <textarea
            class="w-full p-4 rounded-3xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={2}
            placeholder="Write a topic..."
            value={prompt()}
            onInput={(e) => setPrompt(e.target.value)}
          />
          <div class="flex justify-between items-center flex-wrap text-sm text-indigo-200 gap-2">
            <div class="flex gap-4 flex-wrap">
              <label>
                <input
                  type="checkbox"
                  checked={includeHashtag()}
                  onChange={(e) => setIncludeHashtag(e.target.checked)}
                />{" "}
                Hashtags
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={includeEmoji()}
                  onChange={(e) => setIncludeEmoji(e.target.checked)}
                />{" "}
                Emojis
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={generateImage()}
                  onChange={(e) => setGenerateImage(e.target.checked)}
                />{" "}
                Generate Image
              </label>
              <label class="flex items-center gap-2">
                Temp:
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
              onClick={clearChat}
              class="text-sm text-red-400 hover:text-red-300 px-3 py-1 border border-red-400 rounded-lg ml-auto"
              title="Clear chat history"
            >
              🧹 Clear
            </button>
          </div>

          <button
            onClick={generateTweet}
            disabled={loading()}
            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl shadow-md disabled:opacity-50"
          >
            {loading() ? "✨ Generating..." : "🚀 Generate Tweet"}
          </button>
        </div>
      </div>
    </div>
  );
}
