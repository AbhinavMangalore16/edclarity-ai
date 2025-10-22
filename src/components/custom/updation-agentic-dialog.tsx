import { AgenticGetOne } from "@/modules/agentic/types";
import { AgenticForm } from "./agentic-form";
import { DialogCustom } from "./dialog-custom";


interface UpdationAgenticDialogProps{
    open: boolean,
    onOpenChange: (open: boolean) => void;
    initValues: AgenticGetOne;
}

export const UpdationAgenticDialog = ({open, onOpenChange, initValues}: UpdationAgenticDialogProps) =>{
    return (
        <DialogCustom title="Edit Agent" description="Edit existing agent" open={open} onOpenChange={onOpenChange}>
            <AgenticForm onSuccess={()=> onOpenChange(false)} onCancel={()=>onOpenChange(false)} initValues={initValues}/>
        </DialogCustom>
    )
}