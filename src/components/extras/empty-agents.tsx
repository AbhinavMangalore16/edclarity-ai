"use client";
import Image from "next/image";

interface EmptyAgentsProps {
  title?: string;
  description?: string;
}

export default function EmptyAgents({ title, description }: EmptyAgentsProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full text-center">
      <Image
        src="/loader.png"
        alt="Empty Agents"
        width={400}
        height={200}
        className="mb-4"
      />
      <div className="flex flex-col gap-y-4 max-w-md">
        <h6 className="text-lg font-medium">{title}</h6>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
