import { DialogCustom } from "./dialog-custom";


interface AgenticDialogProps{
    open: boolean,
    onOpenChange: (open: boolean) => void;
}

export const AgenticDialog = ({open, onOpenChange}: AgenticDialogProps) =>{
    return (
        <DialogCustom title="New Agent" description="Create a new agent" open={open} onOpenChange={onOpenChange}>
            Agentic Form
        </DialogCustom>
    )
}