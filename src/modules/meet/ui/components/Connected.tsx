"use client"

import { MeetInterface } from "./MeetInterface";

interface ConnectedProps {
    meetingId: string,
    meetingName: string,
    userId: string,
    userName: string,
    userImage: string
}

export const Connected = ({ meetingId, meetingName, userId, userName, userImage }: ConnectedProps) => {
    // We bypass Stream entirely and directly pass to MeetInterface
    return (
        <MeetInterface meetingId={meetingId} meetingName={meetingName} />
    );
};