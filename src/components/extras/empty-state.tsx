"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then(mod => mod.Player),
  { ssr: false }
);

interface EmptyAgentsProps {
  title?: string;
  description?: string;
  image?: string;
  lottieJson?: string; // path or imported JSON file
  loop?: boolean; // whether to loop the animation
}

export default function EmptyAgents({
  title,
  description,
  image = "/loader.png",
  lottieJson,
  loop = true, // default looping on
}: EmptyAgentsProps) {
  const [isLottieLoaded, setIsLottieLoaded] = useState(false);

  useEffect(() => {
    if (lottieJson) {
      setIsLottieLoaded(true);
    }
  }, [lottieJson]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full text-center">
      {lottieJson && isLottieLoaded ? (
        <Player
          autoplay
          loop={loop}
          src={lottieJson}
          className="w-[250px] h-[250px] mb-4"
        />
      ) : (
        <Image
          src={image}
          alt="Empty here"
          width={400}
          height={200}
          className="mb-4"
        />
      )}

      <div className="flex flex-col gap-y-4 max-w-md">
        <h6 className="text-lg font-medium">{title}</h6>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
