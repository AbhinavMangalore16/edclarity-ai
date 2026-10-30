import { PersonaView } from "@/modules/persona/ui/views/persona-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Persona Mode | Discord Class Discussion & AI Notetaker | EdClarity.ai",
  description: "Discord-style discussion forums for individual classes with real-time AI Notetaker Persona assistance.",
};

export default function PersonaPage() {
  return <PersonaView />;
}
