import { ChatInterface } from "./ChatInterface";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "LibraAI | EdClarity",
  description: "Advanced Retrieval-Augmented Generation (RAG) system with LibraAI.",
};

export default function LibraAIPage() {
  return (
    <div className="flex flex-1 min-h-0 h-full w-full bg-gray-50/50 dark:bg-zinc-950">
      <ChatInterface />
    </div>
  );
}
