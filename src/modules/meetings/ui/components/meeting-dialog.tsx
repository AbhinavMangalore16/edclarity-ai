
import { DialogCustom } from "@/components/custom/dialog-custom";
import { useRouter } from "next/navigation";
import { MeetingForm } from "./meeting-form";


interface MeetingDialogProps {
    open: boolean,
    onOpenChange: (open: boolean) => void;
}

export const MeetingDialog = ({ open, onOpenChange }: MeetingDialogProps) => {
    const router = useRouter();
    return (
        <DialogCustom title="New meeting" description="Create a new meeting here" open={open} onOpenChange={onOpenChange}>
            <MeetingForm onCancel={() => onOpenChange(false)}
                onSuccess={
                    (id) => {
                        onOpenChange(false);
                        router.push(`/meetings/${id}`)
                    }} />
        </DialogCustom>
    )
}