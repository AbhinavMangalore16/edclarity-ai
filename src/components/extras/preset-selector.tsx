import React, { useState } from "react";
import { PresetCategory } from "@/config/presets";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PresetSelectorProps {
  categories: PresetCategory[];
  selectedValue: string;
  onSelect: (value: string, instructions?: string) => void;
  disabled?: boolean;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  categories,
  selectedValue,
  onSelect,
  disabled
}) => {
  const [search, setSearch] = useState("");

  const filteredCategories = categories.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase())
    )
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white/5 dark:bg-zinc-900/50 backdrop-blur-sm border-border"
          disabled={disabled}
        />
      </div>
      
      <ScrollArea className="h-64 rounded-xl border bg-white/5 dark:bg-zinc-900/10 p-4">
        {filteredCategories.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            No matches found.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredCategories.map((cat, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {cat.category}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onSelect(item.label, item.instructions)}
                      disabled={disabled}
                      className={`px-4 py-2 text-left rounded-xl text-sm font-medium transition-all duration-200 border ${
                        selectedValue === item.label
                          ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                          : "bg-white/10 dark:bg-zinc-900/50 text-foreground border-border hover:border-primary/50 hover:bg-primary/5 backdrop-blur-sm"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
