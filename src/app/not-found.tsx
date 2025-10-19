"use client";

import dynamic from "next/dynamic";

const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);

export default function NotFound() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Player
        src="/animations/404error.json"
        loop
        autoplay
        className="w-screen h-screen object-cover"
      />
    </div>
  );
}
