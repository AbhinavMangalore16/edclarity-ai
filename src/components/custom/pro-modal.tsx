"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useProModal } from "@/hooks/use-pro-modal";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import Image from "next/image";

export const ProModal = () => {
  const proModal = useProModal();

  if (!proModal.isOpen) return null;

  const isAgentLimit = proModal.reason === "agents";

  return (
    <Dialog open={proModal.isOpen} onOpenChange={proModal.onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-br from-[#1F164F] to-[#0A0720] border-white/10 text-white rounded-3xl">
        {/* Header Art / Graphic */}
        <div className="relative h-48 w-full bg-indigo-600/20 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/30 via-transparent to-transparent opacity-80" />
          <div className="relative z-10 bg-white/10 p-4 rounded-full backdrop-blur-md shadow-2xl border border-white/20">
            <Sparkles className="w-12 h-12 text-yellow-400" />
          </div>
        </div>

        <div className="p-6 md:p-8 flex flex-col items-center text-center space-y-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold font-sora">
              Upgrade to <span className="bg-gradient-to-r from-pink-400 to-indigo-400 bg-clip-text text-transparent">Pro</span>
            </DialogTitle>
            <DialogDescription className="text-gray-300 text-base">
              {proModal.reason === "agents" && "You have reached your Free Tier limit of 5 Agents in the last 14 days."}
              {proModal.reason === "meetings" && "You have reached your Free Tier limit of 3 Meetings per agent in the last 14 days."}
              {proModal.reason === "messages" && "You have reached your Free Tier limit of 20 messages per session."}
              {proModal.reason === "uploads" && "You have reached your Free Tier limit of 3 document uploads."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 w-full bg-white/5 rounded-2xl p-5 border border-white/5 text-sm text-gray-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <span>Create <strong className="text-white">unlimited</strong> AI Agents</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <span>Host <strong className="text-white">unlimited</strong> Meetings</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <span>Access to advanced <strong className="text-white">Apollo-EdC-v1 &amp; Athena-EdC-v1</strong> models</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <span>Priority <strong className="text-white">24/7</strong> Support</span>
            </div>
          </div>

          <Button 
            className="w-full rounded-full py-6 text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all"
            onClick={() => {
                // Future: Integrate Stripe checkout here
                proModal.onClose();
            }}
          >
            <Zap className="w-5 h-5 mr-2" />
            Upgrade Now
          </Button>

          <p className="text-xs text-gray-500">
            Your free limits will automatically reset 14 days after creation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
