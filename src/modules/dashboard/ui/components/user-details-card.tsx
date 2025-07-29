import { CustomAvatar } from "@/components/custom/custom-avatar";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import { ChevronRightIcon, CreditCardIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export const UserDetailsCard = () => {
    const router = useRouter();
    const { data: user, isPending: loading } = authClient.useSession();
    const onSignOut = async () => {
        authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/login");
                }
            }
        })

    }


    if (!user?.user || loading) return null;

    return (
        <DropdownMenu>
            <span className="text-xs text-green-700">Logged in as:</span>
            <DropdownMenuTrigger className="rounded-lg border border-border/20 p-4 w-full flex items-center
      justify-between bg-accent/10 hover:bg-accent/20 transition-colors overflow-hidden">
                {user.user.image ? (
                    <Avatar className="w-10 h-10 ring-1 ring-white/10 shadow-sm">
                        <AvatarImage src={user.user.image} alt={user.user.name || "User"} />
                    </Avatar>
                ) : (
                    <CustomAvatar seed={user.user.name || "User"} variant="initials" className="w-10 h-10 mr-2 ring-1 ring-white/10 shadow-sm" />
                )}

                <div className="flex flex-col gap-0.5 text-left overflow-hidden flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-white">
                        {user.user.name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate ">
                        {user.user.email || "Email not available"}
                    </p>
                </div>

                <ChevronRightIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" side="right" className="w-72 p-4 rounded-lg shadow-lg border bg-popover">
                <DropdownMenuLabel>
                    <div className="flex items-start gap-3">
                        {user.user.image ? (
                            <Avatar className="w-10 h-10 ring-1 ring-white/10 shadow-sm">
                                <AvatarImage src={user.user.image} alt={user.user.name || "User"} />
                            </Avatar>
                        ) : (
                            <CustomAvatar seed={user.user.name || "User"} variant="initials" className="w-10 h-10" />
                        )}

                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate text-black">{user.user.name}</span>
                            <span className="text-xs text-muted-foreground truncate">{user.user.email}</span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="cursor-pointer flex items-center justify-between font-semibold text-foreground hover:bg-accent/20"
                    onClick={() => router.push('/profile')}
                >
                    <span>Profile Settings</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                    className="cursor-pointer flex items-center justify-between text-sm text-foreground hover:bg-accent/20"
                >
                    <span>Pricing</span>
                    <CreditCardIcon className="w-4 h-4 text-muted-foreground" />
                </DropdownMenuItem>

                <DropdownMenuItem
                    className="cursor-pointer flex items-center justify-between text-sm text-foreground hover:bg-accent/20"
                    onClick={onSignOut}
                >
                    <span>Sign Out</span>
                    <LogOutIcon className="w-4 h-4 text-muted-foreground" />
                </DropdownMenuItem>


            </DropdownMenuContent>
        </DropdownMenu>
    );
};
