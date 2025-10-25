import { CircleCheckIcon, CircleXIcon, Clock, ClockArrowUpIcon, ClockFadingIcon, CornerDownRightIcon, Loader2Icon, LoaderIcon, VideoIcon } from "lucide-react";
import { MeetingStatus } from "../../types";
import { useMeetingFilter } from "../../hooks/useMeetingFilter";
import { Selection } from "@/components/extras/selection";

const statuses = [
    {
        id: MeetingStatus.Scheduled,
        value: MeetingStatus.Scheduled,
        children: (
            <div className="flex items-center gap-x-2 capitalize">
                <ClockArrowUpIcon/>
                {MeetingStatus.Scheduled}
            </div>
        )
    },
        {
        id: MeetingStatus.Active,
        value: MeetingStatus.Active,
        children: (
            <div className="flex items-center gap-x-2 capitalize">
                <VideoIcon/>
                {MeetingStatus.Active}
            </div>
        )
    },    {
        id: MeetingStatus.Processing,
        value: MeetingStatus.Processing,
        children: (
            <div className="flex items-center gap-x-2 capitalize">
                <LoaderIcon/>
                {MeetingStatus.Processing}
            </div>
        )
    },
        {
        id: MeetingStatus.Completed,
        value: MeetingStatus.Completed,
        children: (
            <div className="flex items-center gap-x-2 capitalize">
                <CircleCheckIcon/>
                {MeetingStatus.Scheduled}
            </div>
        )
    },
        {
        id: MeetingStatus.Cancelled,
        value: MeetingStatus.Cancelled,
        children: (
            <div className="flex items-center gap-x-2 capitalize">
                <ClockArrowUpIcon/>
                {MeetingStatus.Cancelled}
            </div>
        )
    }
]


export const StatusFilter = () =>{
    const [filters, setFilters] = useMeetingFilter();
    return (
        <Selection
        placeholder="Status"
        className="h-9 w-[160px]" 
        options={statuses}
        onSelect={(value)=> setFilters({status: value as MeetingStatus})}
        value={filters.status?? ""}/>
    )
}