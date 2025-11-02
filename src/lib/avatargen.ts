import { adventurer, initials } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";


interface AvatarGenProps{
    seed: string;
    variant: "Adventurer" | "initials";
}

export const genAvatarURI = ({seed, variant}: AvatarGenProps) =>{
    let avatar;
    if (variant=="Adventurer"){
        avatar = createAvatar(adventurer, {seed});
    }
    else{
        avatar = createAvatar(initials, {seed, fontWeight: 500, fontSize:48})
    }
    return avatar.toDataUri();
}