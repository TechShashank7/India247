import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "Initializing civic network...",
  "Connecting to backend services...",
  "Fetching live complaint data...",
  "Finalizing experience..."
];

export default function AppLoader({ children }) {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    let messageInterval;

    const wakeUpBackend = async () => {
      try {
        await fetch("https://api.india247.shashankraj.in/api/complaints");
      } catch (err) {
        console.log("Backend waking up...");
      } finally {
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            setLoading(false);
          }, 600); // smooth fade duration
        }, 1000);
      }
    };

    // fallback timeout (important for Render cold start)
    const fallback = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setLoading(false);
      }, 600);
    }, 10000);

    wakeUpBackend();

    // message cycling
    messageInterval = setInterval(() => {
      setMessageIndex((prev) =>
        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 2500);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(fallback);
    };
  }, []);

  if (!loading) {
    return children;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-700 ${
        fadeOut ? "opacity-0" : "opacity-100"
      } 
      bg-[radial-gradient(circle_at_20%_20%,rgba(167,51,0,0.08),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(232,84,26,0.08),transparent_40%)] bg-[#f7f9fb]`}
    >
      {/* Glass Card */}
      <div className="bg-white/70 backdrop-blur-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] rounded-3xl px-10 py-8 text-center max-w-sm w-full">

        {/* Title */}
        <h1 className="text-2xl font-bold text-[#191c1e]">
          India247
        </h1>

        {/* Subtitle */}
        <p className="text-sm mt-3 text-gray-500 min-h-[20px] transition-all duration-300">
          {LOADING_MESSAGES[messageIndex]}
        </p>

        {/* Animated Dots Loader */}
        <div className="flex justify-center mt-6 space-x-2">
          <div className="w-2 h-2 bg-[#a73300] rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-[#a73300] rounded-full animate-bounce delay-150"></div>
          <div className="w-2 h-2 bg-[#a73300] rounded-full animate-bounce delay-300"></div>
        </div>

        {/* Fake Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-1 mt-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#a73300] to-[#d14405] animate-[loadingBar_3s_linear_infinite]"></div>
        </div>
      </div>

      {/* Keyframes for progress animation */}
      <style>
        {`
          @keyframes loadingBar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
}