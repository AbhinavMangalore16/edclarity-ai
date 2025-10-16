"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "../ui/button";
import { AgenticDialog } from "./agentic-dialog";
import { useState } from "react";

export const AgenticListAdd = () => {
    const [isAgenticDialogOpen, setAgenticDialogOpen] = useState(false);
  return (
    <>
    <AgenticDialog open={isAgenticDialogOpen} onOpenChange={setAgenticDialogOpen}/>
    <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8">
      <h3 className="text-lg font-semibold text-gray-800">Your Agents</h3>
      <Button type="button" className="flex items-center gap-2" onClick={() => setAgenticDialogOpen(true)}>
        <PlusIcon className="w-4 h-4" />
        Add New Agent
      </Button>
    </div>
    </>
  );
};
