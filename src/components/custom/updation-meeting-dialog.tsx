import { MeetingForm } from "@/modules/meetings/ui/components/meeting-form";
import { AgenticForm } from "./agentic-form";
import { DialogCustom } from "./dialog-custom";
import { MeetingGetOne } from "@/modules/meetings/types";


interface UpdationMeetingDialogProps{
    open: boolean,
    onOpenChange: (open: boolean) => void;
    initValues: MeetingGetOne;
}

export const UpdationMeetingDialog = ({open, onOpenChange, initValues}: UpdationMeetingDialogProps) =>{
    return (
        <DialogCustom title="Edit Meeting" description="Edit details of meeting here" open={open} onOpenChange={onOpenChange}>
            <MeetingForm onSuccess={()=> onOpenChange(false)} onCancel={()=>onOpenChange(false)} initValues={initValues}/>
        </DialogCustom>
    )
}