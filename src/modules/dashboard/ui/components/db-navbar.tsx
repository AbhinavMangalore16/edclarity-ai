"use client"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { PanelLeft, PanelLeftClose, PanelLeftDashed, SearchIcon } from "lucide-react"
import { DBCommandPalette } from "./db-command-palette"
import { useEffect, useState } from "react"

export const DBNavbar = () => {
    const { state, toggleSidebar, isMobile } = useSidebar();
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    useEffect(() => {
        const pressDown = (e: KeyboardEvent) => {
            if ((e.key === "k" || e.key === "K")&&(e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setCommandPaletteOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", pressDown);
        return () => {
            document.removeEventListener("keydown", pressDown);
        };
    }, []);
    return (
        <>
            <DBCommandPalette open={commandPaletteOpen} setOpen={setCommandPaletteOpen} />
            <nav className="flex px-4 py-2 items-center border-b bg-background">
                <Button variant="outline" className="size-9 text-purple-950 text-shadow-purple-600" onClick={toggleSidebar}>
                    {(state == "collapsed" || isMobile) ? <PanelLeft /> : <PanelLeftClose />}
                </Button>
                <Button className="ml-auto h-9 w-[250px] justify-start font-normal text-muted-foreground hover:text-muted-foreground/80"
                    variant="outline"
                    size="default"
                    onClick={() => setCommandPaletteOpen((open) => !open)}>
                    <SearchIcon className="w-4 h-4" />
                    Search
                    <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center justify-center gap-1 rounded border
                bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        <span className="text-xs relative top-[1px]">&#8984;</span>K
                    </kbd>
                </Button>
            </nav>
        </>
    )
}