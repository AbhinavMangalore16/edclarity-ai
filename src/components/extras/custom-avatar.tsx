import { adventurer, botttsNeutral, initials } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";

interface CustomAvatarProps {
    seed: string;
    className?: string;
    variant: "initials" | "botttsNeutral" | "adventurer";
}

export const CustomAvatar = ({ seed, className, variant }: CustomAvatarProps) => {
    let avatar;
    if (variant === "botttsNeutral") {
        avatar = createAvatar(botttsNeutral, {
            seed,
        });
    } else if (variant === "adventurer") {
        avatar = createAvatar(adventurer, { seed });
    } else {
        avatar = createAvatar(initials, {
            seed,
            fontWeight: 500,
            fontSize: 38,
            fontFamily: ["sora", "sans-serif"],
        });
    }
    return (
        <Avatar className={cn("w-9 h-9 shrink-0 rounded-full overflow-hidden", className)}>
            <AvatarImage src={avatar.toDataUri()} className="w-full h-full object-cover" alt="Avatar" />
            <AvatarFallback className="rounded-full">
                {variant === "initials" ? seed.charAt(0).toUpperCase() : null}
            </AvatarFallback>
        </Avatar>
    );
};
