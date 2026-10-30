"use client";

import { useState } from "react";
import { CustomAvatar } from "@/components/extras/custom-avatar";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/lib/auth-client";
import { ChevronRightIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, Loader2Icon, LockIcon, LogOutIcon, ShieldCheckIcon, UserCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const UserDetailsCard = () => {
    const router = useRouter();
    const isMobile = useIsMobile();
    const trpc = useTRPC();
    const { data: sessionUser, isPending: loading } = authClient.useSession();
    const { data: dbUser, refetch: refetchDbUser } = useQuery(trpc.lms.getCurrentUser.queryOptions());

    const [pendingRole, setPendingRole] = useState<"teacher" | "admin" | null>(null);
    const [accessPassword, setAccessPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const setRoleMutation = useMutation(
        trpc.lms.setUserRole.mutationOptions({
            onSuccess: (updated) => {
                toast.success(`Role updated to ${updated?.role?.toUpperCase()}`);
                setPendingRole(null);
                setAccessPassword("");
                setModalError(null);
                refetchDbUser();
                window.location.reload();
            },
            onError: (err) => {
                setModalError(err.message || "Invalid access password");
                toast.error(err.message || "Failed to switch role");
            }
        })
    );

    const handleRoleRequest = (targetRole: "student" | "teacher" | "admin") => {
        if (targetRole === currentRole) {
            toast.info(`You are already in ${targetRole.toUpperCase()} mode`);
            return;
        }
        if (targetRole === "student") {
            setRoleMutation.mutate({ role: "student" });
            return;
        }
        setModalError(null);
        setAccessPassword("");
        setShowPassword(false);
        setPendingRole(targetRole);
    };

    const handleConfirmRoleSwitch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingRole) return;
        if (!accessPassword.trim()) {
            setModalError("Please enter the access password");
            return;
        }
        setModalError(null);
        setRoleMutation.mutate({
            role: pendingRole,
            accessPassword: accessPassword.trim(),
        });
    };

    const onSignOut = async () => {
        authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/login");
                }
            }
        });
    };

    if (!sessionUser?.user || loading) return null;

    const currentRole = dbUser?.role || (sessionUser.user as any).role || "student";

    const roleAccessDialog = (
        <Dialog
            open={pendingRole !== null}
            onOpenChange={(open) => {
                if (!open) {
                    setPendingRole(null);
                    setAccessPassword("");
                    setModalError(null);
                }
            }}
        >
            <DialogContent className="sm:max-w-[420px] bg-white dark:bg-zinc-950 border-purple-200 dark:border-purple-900/40 rounded-2xl shadow-2xl">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center mb-2">
                        <KeyRoundIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <DialogTitle className="text-center text-xl font-bold">
                        {pendingRole === "admin" ? "SuperAdmin Access Required" : "Teacher Studio Access Required"}
                    </DialogTitle>
                    <DialogDescription className="text-center text-xs text-muted-foreground">
                        Enter the encrypted {pendingRole === "admin" ? "Administrator" : "Teacher"} authorization passphrase to elevate your account privileges.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleConfirmRoleSwitch} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="role-access-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {pendingRole === "admin" ? "Admin Passphrase" : "Teacher Passphrase"}
                        </Label>
                        <div className="relative">
                            <LockIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                id="role-access-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter access passphrase..."
                                value={accessPassword}
                                onChange={(e) => {
                                    setAccessPassword(e.target.value);
                                    if (modalError) setModalError(null);
                                }}
                                autoFocus
                                className="pl-9 pr-10 bg-zinc-50 dark:bg-zinc-900"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                            </button>
                        </div>
                        {modalError && (
                            <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                {modalError}
                            </p>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setPendingRole(null);
                                setAccessPassword("");
                                setModalError(null);
                            }}
                            disabled={setRoleMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={setRoleMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                        >
                            {setRoleMutation.isPending ? (
                                <>
                                    <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <ShieldCheckIcon className="w-4 h-4 mr-1.5" />
                                    Unlock {pendingRole === "admin" ? "Admin" : "Teacher"}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );

    if (isMobile) {
        return (
            <>
                {roleAccessDialog}
                <Drawer>
                    <DrawerTrigger className="rounded-xl border border-white/15 p-3 w-full flex items-center justify-between gap-x-3 bg-white/10 hover:bg-white/15 transition-colors overflow-hidden">
                        {sessionUser.user.image ? (
                            <Avatar className="w-10 h-10 shrink-0 rounded-full overflow-hidden ring-2 ring-white/20 shadow-sm">
                                <AvatarImage src={sessionUser.user.image} alt={sessionUser.user.name || "User"} className="w-full h-full object-cover" />
                            </Avatar>
                        ) : (
                            <CustomAvatar seed={sessionUser.user.name || "User"} variant="initials" className="w-10 h-10 shrink-0 ring-2 ring-white/20 shadow-sm" />
                        )}

                        <div className="flex flex-col gap-0.5 text-left overflow-hidden flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-white">
                                {sessionUser.user.name || "User"}
                            </p>
                            <p className="text-xs text-white/70 truncate">
                                {sessionUser.user.email || "Email not available"}
                            </p>
                        </div>

                        <ChevronRightIcon className="w-4 h-4 text-white/70 shrink-0" />
                    </DrawerTrigger>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>{sessionUser.user.name}</DrawerTitle>
                            <DrawerDescription>{sessionUser.user.email}</DrawerDescription>
                        </DrawerHeader>
                        <div className="px-4 py-2 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Switch Role
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    variant={currentRole === "student" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleRoleRequest("student")}
                                >
                                    Student
                                </Button>
                                <Button
                                    variant={currentRole === "teacher" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleRoleRequest("teacher")}
                                >
                                    Teacher
                                </Button>
                                <Button
                                    variant={currentRole === "admin" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleRoleRequest("admin")}
                                >
                                    Admin
                                </Button>
                            </div>
                        </div>
                        <DrawerFooter>
                            <Button variant="outline" onClick={onSignOut}>
                                <LogOutIcon className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            </>
        );
    }

    return (
        <>
            {roleAccessDialog}
            <DropdownMenu>
                <div className="px-1 py-1 flex items-center justify-between text-xs text-white/80">
                    <span className="font-medium">Role:</span>
                    <Badge variant="outline" className="capitalize text-xs bg-white/15 text-white border-white/25 font-semibold">
                        {currentRole}
                    </Badge>
                </div>
                <DropdownMenuTrigger className="rounded-xl border border-white/15 p-3 w-full flex items-center justify-between gap-x-3 bg-white/10 hover:bg-white/15 transition-colors overflow-hidden">
                    {sessionUser.user.image ? (
                        <Avatar className="w-9 h-9 shrink-0 rounded-full overflow-hidden ring-2 ring-white/20 shadow-sm">
                            <AvatarImage src={sessionUser.user.image} alt={sessionUser.user.name || "User"} className="w-full h-full object-cover" />
                        </Avatar>
                    ) : (
                        <CustomAvatar seed={sessionUser.user.name || "User"} variant="initials" className="w-9 h-9 shrink-0 ring-2 ring-white/20 shadow-sm" />
                    )}

                    <div className="flex flex-col gap-0.5 text-left overflow-hidden flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-white">
                            {sessionUser.user.name || "User"}
                        </p>
                        <p className="text-xs text-white/70 truncate">
                            {sessionUser.user.email || "Email not available"}
                        </p>
                    </div>

                    <ChevronRightIcon className="w-4 h-4 text-white/70 shrink-0" />
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" side="right" className="w-72 p-4 rounded-lg shadow-lg border bg-popover">
                    <DropdownMenuLabel>
                        <div className="flex items-start gap-3">
                            {sessionUser.user.image ? (
                                <Avatar className="w-10 h-10 ring-1 ring-white/10 shadow-sm">
                                    <AvatarImage src={sessionUser.user.image} alt={sessionUser.user.name || "User"} />
                                </Avatar>
                            ) : (
                                <CustomAvatar seed={sessionUser.user.name || "User"} variant="initials" className="w-10 h-10" />
                            )}

                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-medium truncate text-foreground">{sessionUser.user.name}</span>
                                <span className="text-xs text-muted-foreground truncate">{sessionUser.user.email}</span>
                                <Badge variant="outline" className="w-fit mt-1 capitalize text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                                    {currentRole}
                                </Badge>
                            </div>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Switch Role
                    </div>

                    <DropdownMenuItem
                        className={`cursor-pointer flex items-center justify-between text-sm ${currentRole === 'teacher' ? 'font-bold text-purple-700' : ''}`}
                        onClick={() => handleRoleRequest('teacher')}
                    >
                        <span className="flex items-center gap-2">
                            <UserCheckIcon className="w-4 h-4 text-purple-600" />
                            Switch to Teacher
                        </span>
                        {currentRole === 'teacher' ? (
                            <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
                        ) : (
                            <LockIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        className={`cursor-pointer flex items-center justify-between text-sm ${currentRole === 'admin' ? 'font-bold text-purple-700' : ''}`}
                        onClick={() => handleRoleRequest('admin')}
                    >
                        <span className="flex items-center gap-2">
                            <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
                            Switch to Admin
                        </span>
                        {currentRole === 'admin' ? (
                            <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
                        ) : (
                            <LockIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        className={`cursor-pointer flex items-center justify-between text-sm ${currentRole === 'student' ? 'font-bold text-purple-700' : ''}`}
                        onClick={() => handleRoleRequest('student')}
                    >
                        <span className="flex items-center gap-2">
                            <UserCheckIcon className="w-4 h-4 text-gray-600" />
                            Switch to Student
                        </span>
                        {currentRole === 'student' && <ShieldCheckIcon className="w-4 h-4 text-purple-600" />}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        className="cursor-pointer flex items-center justify-between text-sm text-foreground hover:bg-accent/20"
                        onClick={onSignOut}
                    >
                        <span>Sign Out</span>
                        <LogOutIcon className="w-4 h-4 text-muted-foreground" />
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
};
