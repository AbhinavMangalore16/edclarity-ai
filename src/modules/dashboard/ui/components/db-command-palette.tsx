import { CommandCustomDialog, CommandItem, CommandList, CommandInput, CommandEmpty } from "@/components/ui/command";
import { Dispatch, SetStateAction } from "react";

interface DBCommandPaletteProps {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
}
export const DBCommandPalette = ({open, setOpen}: DBCommandPaletteProps) => {
    return (
        <CommandCustomDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Find a meeting or agent"/>
            <CommandList>
                <CommandItem>
                    Test1
                </CommandItem>
            </CommandList>
        </CommandCustomDialog>

    )
}