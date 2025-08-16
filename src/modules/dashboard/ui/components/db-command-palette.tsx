import { CommandDialog, CommandItem, CommandList } from "@/components/ui/command";
import { CommandInput } from "cmdk";
import { Search } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

interface DBCommandPaletteProps {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
}
export const DBCommandPalette = ({open, setOpen}: DBCommandPaletteProps) => {
    return (
        <CommandDialog open={open} onOpenChange={setOpen}>

            <CommandInput placeholder="Find a meeting or agent"/>
            <CommandList>
                <CommandItem>
                    Test1
                </CommandItem>
            </CommandList>
        </CommandDialog>

    )
}