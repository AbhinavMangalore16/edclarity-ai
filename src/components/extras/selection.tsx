import { ReactNode, useState } from "react";
import { Button } from "../ui/button";
import { ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandCustomDialog, CommandInput, CommandList, CommandItem } from "../ui/command";
import { CommandEmpty } from "cmdk";

interface SelectionProps {
  options: Array<{ id: string; value: string; children: ReactNode }>;
  placeholder?: string;
  className?: string;
  value?: string;
  onSelect: (value: string) => void;
  onSearch?: (value: string) => void;
}

export const Selection = ({
  options,
  placeholder,
  value,
  className,
  onSelect,
  onSearch,
}: SelectionProps) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const correctOpen = (value: boolean) =>{
    onSearch?.(""),
    setOpen(value)
  }

  return (
    <>
      {/* Trigger button */}
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-9 w-full justify-between font-normal px-3",
          !selectedOption && "text-muted-foreground",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <div>{selectedOption?.children ?? placeholder}</div>
        <ChevronsUpDownIcon className="w-4 h-4 opacity-70" />
      </Button>

      {/* Command Dialog (Rendered outside Button) */}
      <CommandCustomDialog
        open={open}
        onOpenChange={correctOpen}
        title="Choose your agent"
        description="Select an agent from the list"
        shouldFilter={!onSearch}
      >
        <CommandInput placeholder="Search here..." onValueChange={onSearch} />
        <CommandList>
          <CommandEmpty>
            <div className="flex items-center justify-center py-6 px-4">
              <span className="text-muted-foreground text-sm">No results found...</span>
            </div>
          </CommandEmpty>

          {options.map((option) => (
            <CommandItem
              key={option.id}
              onSelect={() => {
                onSelect(option.value);
                setOpen(false);
              }}
            >
              {option.children}
            </CommandItem>
          ))}
        </CommandList>
      </CommandCustomDialog>
    </>
  );
};
