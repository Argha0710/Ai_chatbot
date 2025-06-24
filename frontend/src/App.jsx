import { createSignal, onMount, createEffect } from "solid-js";
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
  const [darkMode, setDarkMode] = createSignal(false);

  onMount(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  });

  createEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode());
  });

  const generateTweet = async () => {
    if (!prompt()) return;
    setLoading(true);
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${BACKEND_URL}/generate`, {
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
    <div class="min-h-screen bg-white dark:bg-gray-950 text-gray-800 dark:text-white transition-colors duration-300">
      <div class="max-w-2xl mx-auto px-6 py-12">
        <header class="flex justify-between items-center mb-10">
          <h1 class="text-3xl font-bold tracking-tight">
            <span class="bg-indigo-600 dark:bg-indigo-400 text-white dark:text-gray-900 px-4 py-1 rounded-full shadow-md">
              AI Tweet Studio
            </span>
          </h1>
          <button
            class="bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full p-2 focus:outline-none shadow hover:bg-gray-300 dark:hover:bg-gray-700"
            onClick={() => {
              const newMode = !darkMode();
              setDarkMode(newMode);
              localStorage.setItem("theme", newMode ? "dark" : "light");
            }}
          >
            {darkMode() ? "🌙" : "☀️"}
          </button>
        </header>

        <section class="bg-gray-100 dark:bg-gray-900 p-6 rounded-2xl shadow-lg border dark:border-gray-700">
          <label for="tweet-topic" class="block text-lg font-semibold mb-2">
            What should your tweet be about?
          </label>
          <textarea
            id="tweet-topic"
            class="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows="3"
            placeholder="E.g. AI, productivity, web development..."
            value={prompt()}
            onInput={(e) => setPrompt(e.target.value)}
          />

          <div class="flex flex-col sm:flex-row gap-4 mt-4">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeHashtag()} onChange={(e) => setIncludeHashtag(e.target.checked)} class="rounded" />
              Include hashtag (e.g. #AI)
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeEmoji()} onChange={(e) => setIncludeEmoji(e.target.checked)} class="rounded" />
              Include emoji (e.g. 🎯)
            </label>
          </div>

          <button
            class="mt-6 w-full bg-indigo-600 dark:bg-indigo-500 text-white font-semibold py-2 rounded-xl shadow hover:bg-indigo-700 dark:hover:bg-indigo-600 transition disabled:opacity-50"
            onClick={generateTweet}
            disabled={loading()}
          >
            {loading() ? "Generating..." : "Generate Tweet"}
          </button>
        </section>

        {tweet() && (
          <section class="mt-10 animate-fade-in">
            <h2 class="text-xl font-semibold mb-2">Your Generated Tweet</h2>
            <div class="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700 p-4 rounded-xl shadow flex flex-col gap-3">
              {editing() ? (
                <textarea
                  class="w-full p-2 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                  value={editedTweet()}
                  rows={3}
                  onInput={(e) => setEditedTweet(e.target.value)}
                />
              ) : (
                <p class="text-gray-800 dark:text-gray-100">{tweet()}</p>
              )}

              <div class="flex justify-end gap-3">
                <button class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline" onClick={() => navigator.clipboard.writeText(tweet())}>
                  📋 Copy
                </button>

                {editing() ? (
                  <>
                    <button
                      class="text-sm text-green-600 dark:text-green-400 hover:underline"
                      onClick={() => {
                        setTweet(editedTweet());
                        const updated = history().map((item, i) => i === 0 ? { ...item, text: editedTweet() } : item);
                        setHistory(updated);
                        setEditing(false);
                      }}
                    >💾 Save</button>
                    <button class="text-sm text-gray-400 hover:underline" onClick={() => setEditing(false)}>
                      ❌ Cancel
                    </button>
                  </>
                ) : (
                  <button class="text-sm text-yellow-600 dark:text-yellow-400 hover:underline" onClick={() => {
                    setEditedTweet(tweet());
                    setEditing(true);
                  }}>
                    ✏️ Edit
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {history().length > 0 && (
          <section class="mt-10">
            <h2 class="text-xl font-semibold mb-4">Previous Tweets</h2>
            <ul class="space-y-4">
              {history().map((item, index) => (
                <li class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow">
                  <p class="text-gray-800 dark:text-gray-200">{item.text}</p>
                  <div class="flex justify-between text-sm mt-2">
                    <span class="text-gray-500 dark:text-gray-400 italic">Topic: {item.topic}</span>
                    {item.posted ? (
                      <span class="text-green-600 dark:text-green-400 font-semibold">✅ Posted</span>
                    ) : (
                      <button class="text-green-600 dark:text-green-400 hover:underline" onClick={() => postTweet(index)}>
                        Post to Twitter
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


// import { createSignal, onMount, createEffect } from "solid-js"; 
// import "./index.css";
// import "solid-js/web";

// export default function App() {
//   const [prompt, setPrompt] = createSignal("");
//   const [tweet, setTweet] = createSignal("");
//   const [history, setHistory] = createSignal([]);
//   const [loading, setLoading] = createSignal(false);
//   const [editing, setEditing] = createSignal(false);
//   const [editedTweet, setEditedTweet] = createSignal("");
//   const [includeHashtag, setIncludeHashtag] = createSignal(false);
//   const [includeEmoji, setIncludeEmoji] = createSignal(false);


  


//   // 🆕 Dark mode state
//   const [darkMode, setDarkMode] = createSignal(false);

//   onMount(() => {
//     const saved = localStorage.getItem("theme");
//     const isDark = saved === "dark";
//     setDarkMode(isDark);
//     // Immediately set the class on mount for first render
//     if (isDark) {
//       document.documentElement.classList.add("dark");
//     } else {
//       document.documentElement.classList.remove("dark");
//     }
//   });

//   // Always keep the HTML class in sync with darkMode
//   createEffect(() => {
//     // Keep in sync for subsequent toggles
//     if (darkMode()) {
//       document.documentElement.classList.add("dark");
//     } else {
//       document.documentElement.classList.remove("dark");
//     }
//   });

// // 🆕 Function to generate tweet (no auto-posting)
// const generateTweet = async () => {
//   if (!prompt()) return;
//   setLoading(true); // 🧠 Start thinking

//   try {
//     const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
//     const response = await fetch(`${BACKEND_URL}/generate`, {

//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ 
//   prompt: prompt(), 
//   hashtag: includeHashtag(), 
//   emoji: includeEmoji()
// }),


//     });

//     if (!response.ok) {
//       throw new Error("Failed to generate tweet");
//     }

//     const data = await response.json();
//     const tweetText = data.result;

//     setTweet(tweetText);
//     setHistory([{ text: tweetText, topic: prompt(), posted: false }, ...history()]);
//     setPrompt("");
//   } catch (error) {
//     console.error("Error generating tweet:", error);
//     alert("Something went wrong while generating the tweet.");
//   } finally {
//     setLoading(false); // ✅ Stop thinking
//   }
// };


// // const generateTweet = async () => {
// //   if (!prompt()) return;
// //   setLoading(true); // 🧠 Start thinking

// //   try {
// //     const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// //     const response = await fetch(${BACKEND_URL}/generate, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({ prompt: prompt() }),
// //     });

// //     if (!response.ok) throw new Error("Failed to generate tweet");

// //     const data = await response.json();
// //     const tweetText = data.result;

// //     const postResponse = await fetch("https://twitterclone-server-2xz2.onrender.com/post_tweet", {
// //       method: "POST",
// //       headers: {
// //         "Content-Type": "application/json",
// //         "api-key": import.meta.env.VITE_TWITTER_CLONE_API_KEY,
// //       },
// //       body: JSON.stringify({ text: tweetText }),
// //     });

// //     if (!postResponse.ok) throw new Error("Tweet generated but failed to post.");

// //     setTweet(tweetText);
// //     setHistory([{ text: tweetText, topic: prompt(), posted: true }, ...history()]);
// //     setPrompt("");

// //   } catch (error) {
// //     alert("Something went wrong: " + error.message);
// //   } finally {
// //     setLoading(false); // ✅ Stop thinking
// //   }
// // };


//   const postTweet = async (index) => {
//   const tweetToPost = history()[index];

//   try {
//     const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/post_tweet`, {

//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "api-key": import.meta.env.VITE_TWITTER_CLONE_API_KEY,
//       },
//       body: JSON.stringify({
//         username: "argha",               // ✅ required now
//         text: tweetToPost.text,         // ✅ the actual tweet text
//       }),
//     });

//     if (!response.ok) {
//       throw new Error("Failed to post tweet");
//     }

//     // Mark tweet as posted ✅
//     const updated = history().map((item, i) =>
//       i === index ? { ...item, posted: true } : item
//     );
//     setHistory(updated);
//   } catch (error) {
//     console.error("Error posting tweet:", error);
//     alert("Tweet post failed: " + error.message);
//   }
// };



//   return (
//     <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500">
//       <div class="max-w-2xl mx-auto px-4 py-10">
//         <header class="flex items-center justify-between mb-8">
//           <h1 class="text-3xl font-extrabold tracking-tight text-gray-800 dark:text-white flex items-center gap-2">
//             <span class="inline-block bg-indigo-600 dark:bg-indigo-400 text-white dark:text-gray-900 rounded-full px-3 py-1 text-lg shadow-sm">
//               AI Tweet Studio
//             </span>
//           </h1>
//           {/* <button
//             aria-label="Toggle dark mode"
//             class="transition-colors duration-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full p-2 shadow hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
//             onClick={() => {
//               const isDark = !darkMode();
//               setDarkMode(isDark);
//               localStorage.setItem("theme", isDark ? "dark" : "light");
//             }}
//           >
//             <span class="text-xl">{darkMode() ? "🌙" : "☀️"}</span>
//           </button> */}
//         </header>

//         <main>
//           <section class="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 mb-8 p-6 transition-colors duration-500">
//             <label
//               for="tweet-topic"
//               class="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-2"
//             >
//               What should your tweet be about?
//             </label>
         
//             <textarea
//               id="tweet-topic"
//               class="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//               rows="3"
//               placeholder="E.g. AI, productivity, web development..."
//               value={prompt()}
//               onInput={(e) => setPrompt(e.target.value)}
//               aria-label="Tweet topic"
//             />
//             <div class="flex items-center mt-3">
//   <input
//     id="hashtag-check"
//     type="checkbox"
//     checked={includeHashtag()}
//     onChange={(e) => setIncludeHashtag(e.target.checked)}
//     class="mr-2 w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
//   />
  
//   <label for="hashtag-check" class="text-sm text-gray-700 dark:text-gray-300">
//     Include hashtag at the end (e.g. #AI)
//   </label>
// </div>
// <div class="flex items-center mt-2">
//   <input
//     id="emoji-check"
//     type="checkbox"
//     checked={includeEmoji()}
//     onChange={(e) => setIncludeEmoji(e.target.checked)}
//     class="mr-2 w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:bg-gray-700 dark:border-gray-600"
//   />
//   <label for="emoji-check" class="text-sm text-gray-700 dark:text-gray-300">
//     Include emoji (e.g. 🎯)
//   </label>
// </div>


//             <button
//   class="mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition py-2 px-4 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
//   onClick={generateTweet}
//   disabled={loading()}
// >
//   {loading() ? (
//   <div class="flex justify-center gap-1 items-center">
//     <span>Thinking</span>
//     <div class="animate-pulse w-1 h-1 bg-white rounded-full"></div>
//     <div class="animate-pulse w-1 h-1 bg-white rounded-full delay-75"></div>
//     <div class="animate-pulse w-1 h-1 bg-white rounded-full delay-150"></div>
//   </div>
// ) : (
//   "Generate Tweet"
// )}

// </button>

//           </section>

//           {tweet() && (
//   <section class="mb-8 animate-fade-in">
//     <h2 class="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
//       Your Generated Tweet
//     </h2>

//     <div class="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700 rounded-xl shadow p-4 flex flex-col gap-2">
//       {editing() ? (
//         <textarea
//           class="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
//           value={editedTweet()}
//           rows={3}
//           onInput={(e) => setEditedTweet(e.target.value)}
//         />
//       ) : (
//         <p class="text-gray-800 dark:text-gray-100">{tweet()}</p>
//       )}

//       <div class="flex justify-end gap-3 mt-2">
//         <button
//           class="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
//           onClick={() => navigator.clipboard.writeText(tweet())}
//         >
//           📋 Copy
//         </button>

//         {editing() ? (
//           <>
//             <button
//               class="text-green-600 dark:text-green-400 hover:underline text-sm"
//               onClick={() => {
//   setTweet(editedTweet()); // Update visible tweet
//   const updatedHistory = history().map((item, i) =>
//     i === 0 ? { ...item, text: editedTweet() } : item
//   );
//   setHistory(updatedHistory); // Also update history's first tweet
//   setEditing(false); // Exit edit mode
// }}

//             >
//               💾 Save
//             </button>
//             <button
//               class="text-gray-500 dark:text-gray-400 hover:underline text-sm"
//               onClick={() => setEditing(false)}
//             >
//               ❌ Cancel
//             </button>
//           </>
//         ) : (
//           <button
//             class="text-yellow-600 dark:text-yellow-400 hover:underline text-sm"
//             onClick={() => {
//               setEditedTweet(tweet());
//               setEditing(true);
//             }}
//           >
//             ✏️ Edit
//           </button>
//         )}
//       </div>
//     </div>
//   </section>
// )}


//           {history().length > 0 && (
//             <section>
//               <h2 class="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-4">
//                 Previous Tweets
//               </h2>
//               <ul class="space-y-4">
//                 {history().map((item, index) => (
//                   <li class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow p-4 flex flex-col gap-2">
//                     <span class="text-gray-700 dark:text-gray-200">
//                       {item.text}
//                     </span>
//                     <div class="flex items-center justify-between text-sm">
//                       <span class="text-gray-500 dark:text-gray-400 italic">
//                         Topic: {item.topic}
//                       </span>
//                       {item.posted ? (
//                         <span class="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
//                           ✅ Posted
//                         </span>
//                       ) : (
//                         <button
//                           class="text-green-600 dark:text-green-400 hover:underline"
//                           onClick={() => postTweet(index)}
//                         >
//                           Post to Twitter
//                         </button>
//                       )}
//                     </div>
//                   </li>
//                 ))}
//               </ul>
//             </section>
//           )}
//         </main>
//       </div>
//     </div>
//   );
// }