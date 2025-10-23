
import { DialogCustom } from "@/components/custom/dialog-custom";


interface MeetingDialogProps{
    open: boolean,
    onOpenChange: (open: boolean) => void;
}

export const MeetingDialog = ({open, onOpenChange}: MeetingDialogProps) =>{
    return (
        <DialogCustom title="New meeting" description="Create a new meeting here" open={open} onOpenChange={onOpenChange}>
            Content here for form...
        </DialogCustom>
    )
}