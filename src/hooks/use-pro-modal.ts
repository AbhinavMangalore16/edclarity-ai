import { create } from 'zustand';

interface ProModalState {
  isOpen: boolean;
  reason: "agents" | "meetings" | "messages" | "uploads" | null;
  onOpen: (reason: "agents" | "meetings" | "messages" | "uploads") => void;
  onClose: () => void;
}

export const useProModal = create<ProModalState>((set) => ({
  isOpen: false,
  reason: null,
  onOpen: (reason) => set({ isOpen: true, reason }),
  onClose: () => set({ isOpen: false, reason: null }),
}));
