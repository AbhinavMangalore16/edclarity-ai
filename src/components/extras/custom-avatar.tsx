import {adventurer, botttsNeutral , initials} from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { Avatar } from '@radix-ui/react-avatar';
import { AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';


interface CustomAvatarProps {
    seed: string;
    className?: string;
    variant: "initials" | "botttsNeutral" | "adventurer";
}

export const CustomAvatar = ({ seed, className, variant}: CustomAvatarProps) => {
    let avatar;
    if (variant === "botttsNeutral") {
        avatar = createAvatar(botttsNeutral, {
            seed
        })
    } 
    else if (variant === "adventurer"){
        avatar = createAvatar(adventurer, {seed})
    }
    else {
        avatar = createAvatar(initials, {
            seed,
            fontWeight: 500,
            fontSize: 32,
            fontFamily: ["sora", "sans-serif"],
        })
    }
    return (
        <Avatar className={cn(className, "w-16 h-12")}>
            <AvatarImage src = {avatar.toDataUri()} className={className} alt="Avatar" />
            <AvatarFallback>
                {variant === "initials" ? seed.charAt(0).toUpperCase() : null}
            </AvatarFallback>
        </Avatar>
    )
}
