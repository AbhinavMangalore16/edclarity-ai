import {botttsNeutral , initials} from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { Avatar } from '@radix-ui/react-avatar';
import { AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';


interface CustomAvatarProps {
    seed: string;
    className?: string;
    variant: "initials" | "botttsNeutral";
}

export const CustomAvatar = ({ seed, className, variant}: CustomAvatarProps) => {
    let avatar;
    if (variant === "botttsNeutral") {
        avatar = createAvatar(botttsNeutral, {
            seed
        })
    } else {
        avatar = createAvatar(initials, {
            seed,
            fontWeight: 500,
            fontSize: 32,
            fontFamily: ["sora", "sans-serif"],
        })
    }
    return (
        <Avatar className={cn(className, "w-10 h-10")}>
            <AvatarImage src = {avatar.toDataUri()} className={className} alt="Avatar" />
            <AvatarFallback>
                {variant === "initials" ? seed.charAt(0).toUpperCase() : null}
            </AvatarFallback>
        </Avatar>
    )
}
