"use client";

import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { BotMessageSquareIcon, DiamondPlusIcon, HeadsetIcon, MegaphoneIcon, VideoIcon, ScanSearchIcon, AwardIcon, WorkflowIcon, GraduationCapIcon, BookOpenCheckIcon, CheckCircle2, Loader2Icon, SparklesIcon, MessageSquareIcon, DollarSignIcon, ActivityIcon, BellIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserDetailsCard } from "./user-details-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const top = [
    {
        icon: ScanSearchIcon,
        label: "EdClarity.ai",
        href: "/LibraAI",
    },
    {
        icon: GraduationCapIcon,
        label: "LMS Courses",
        href: "/courses",
    },
    {
        icon: MessageSquareIcon,
        label: "Persona Mode",
        href: "/persona",
    },
    {
        icon: BookOpenCheckIcon,
        label: "Teacher Studio",
        href: "/teacher/courses",
    },
    {
        icon: DollarSignIcon,
        label: "Teacher Earnings",
        href: "/teacher/earnings",
    },
    {
        icon: VideoIcon,
        label: "Your Meetings",
        href: "/meetings",
    },
    {
        icon: BotMessageSquareIcon,
        label: "Your EdTutors",
        href: "/agentic",
    },
    {
        icon: AwardIcon,
        label: "Your Clarities",
        href: "/clarities",
    },
    {
        icon: WorkflowIcon,
        label: "Airflow Pipelines",
        href: "/airflow",
    },
    {
        icon: ActivityIcon,
        label: "AI Observability",
        href: "/admin/observability",
    },
    {
        icon: CheckCircle2,
        label: "AI Review Queue",
        href: "/admin/review",
    },
    {
        icon: BellIcon,
        label: "Admin Alerts",
        href: "/admin/notifications",
    },
];

const bottom = [
    {
        icon: DiamondPlusIcon,
        label: "Upgrade to EdClarity Pro",
        href: "/pro",
    },
    {
        icon: MegaphoneIcon,
        label: "Dev Corner",
        href: "/announcements",
    },
    {
        icon: HeadsetIcon,
        label: "Support",
        href: "/support",
    }
];

export const DashboardSidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const trpc = useTRPC();
    const { data: sessionUser } = authClient.useSession();
    const { data: dbUser, refetch: refetchDbUser } = useQuery(trpc.lms.getCurrentUser.queryOptions());

    const currentRole = dbUser?.role || (sessionUser?.user as any)?.role || "student";
    const isPro = dbUser?.isPro || (sessionUser?.user as any)?.isPro || false;

    const proCheckoutMutation = useMutation(
        trpc.lms.createProCheckoutSession.mutationOptions({
            onSuccess: (data) => {
                if (data?.isProUpgraded) {
                    toast.success("Successfully upgraded to EdClarity Pro!");
                    refetchDbUser();
                } else if (data?.checkoutUrl) {
                    if (data.checkoutUrl.startsWith("http")) {
                        toast.loading("Redirecting to Dodo Payments...");
                        window.location.href = data.checkoutUrl;
                    } else {
                        toast.success("Subscribed to EdClarity Pro!");
                        refetchDbUser();
                        router.push(data.checkoutUrl);
                    }
                }
            },
            onError: (err) => {
                toast.error(err.message || "Pro subscription checkout failed");
            }
        })
    );

    // Filter top sidebar navigation strictly by RBAC role
    const filteredTop = top.filter((item) => {
        if (item.href === "/airflow" || item.href === "/admin/observability" || item.href === "/admin/review" || item.href === "/admin/notifications") {
            // Admin only
            return currentRole === "admin";
        }
        if (item.href === "/teacher/courses" || item.href === "/teacher/earnings") {
            // Teacher and Admin only
            return currentRole === "teacher" || currentRole === "admin";
        }
        return true;
    });

    return (
        <Sidebar>
            <SidebarHeader className="text-sidebar-accent-foreground">
                <Link href="/" className="flex items-center gap-2 px-2 pt-2">
                    <Image src="/logo.png" alt="EdClarity.ai Logo" width={64} height={64} className="rounded-full" />
                    <p className="text-xl font-sora">EdClarity.ai</p>
                </Link>
            </SidebarHeader>
            <div className="px-2 py-1">
                <Separator className="opacity-20 text-[#737373]-900" />
            </div>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {filteredTop.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        className={cn(
                                            "h-10 rounded-md transition-colors duration-200 px-3 py-2 font-medium text-white",
                                            pathname === item.href
                                                ? "bg-[oklch(0.32_0.14_283.1)] shadow-inner border border-[oklch(0.5_0.1_283.1)]"
                                                : "hover:bg-[oklch(0.28_0.12_283.1)] hover:border-[oklch(0.5_0.1_283.1)] border border-transparent"
                                        )}
                                    >
                                        <Link href={item.href}>
                                            <span className="flex items-center gap-2">
                                                <item.icon className="w-5 h-5" />
                                                {item.label}
                                            </span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <div className="px-2 py-1">
                    <Separator className="opacity-20 text-[#737373]-900" />
                </div>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {bottom.map((item) => {
                                const isProItem = item.href === "/pro";
                                const buttonContent = (
                                    <span className="flex items-center justify-between w-full">
                                        <span className="flex items-center gap-2">
                                            <item.icon className="w-5 h-5" />
                                            {isProItem && isPro ? "EdClarity Pro Active" : item.label}
                                        </span>
                                        {isProItem && isPro && (
                                            <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-1.5 py-0.5 rounded uppercase">
                                                PRO
                                            </span>
                                        )}
                                    </span>
                                );
                                const buttonClass = cn(
                                    "h-10 rounded-md transition-colors duration-200 px-3 py-2 font-medium text-white w-full text-left flex items-center",
                                    pathname === item.href && !isProItem
                                        ? "bg-[oklch(0.32_0.14_283.1)] shadow-inner border border-[oklch(0.5_0.1_283.1)]"
                                        : "hover:bg-[oklch(0.28_0.12_283.1)] hover:border-[oklch(0.5_0.1_283.1)] border border-transparent"
                                );

                                if (isProItem) {
                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <SidebarMenuButton className={buttonClass} isActive={false}>
                                                        {buttonContent}
                                                    </SidebarMenuButton>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[440px] bg-white dark:bg-zinc-950 border-purple-100 dark:border-purple-900/30">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                                            <SparklesIcon className="w-6 h-6 text-amber-500 fill-amber-400" />
                                                            EdClarity Pro
                                                        </DialogTitle>
                                                        <DialogDescription>
                                                            Unlock unlimited ultra-fast AI inference, full pipeline access, and state-of-the-art co-teachers.
                                                        </DialogDescription>
                                                    </DialogHeader>

                                                    <div className="flex flex-col gap-3.5 py-2">
                                                        <div className="flex items-start gap-3">
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-semibold text-foreground text-sm">Ultra-Fast Olympus-EdC-v1 Voice & Chat</p>
                                                                <p className="text-xs text-muted-foreground">Sub-50ms latency reasoning powered by Athena-EdC-v1 & Hermes-EdC-v1.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-semibold text-foreground text-sm">Unlimited RAG & Clarities Access</p>
                                                                <p className="text-xs text-muted-foreground">No query caps across all your courses, meeting transcripts, and tutor interactions.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-semibold text-foreground text-sm">Fast Linguistic Safety Guardrails</p>
                                                                <p className="text-xs text-muted-foreground">Built-in prompt injection defense & automated content filter monitoring.</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-3 border-t border-border flex flex-col gap-2">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-muted-foreground">Pro Billing Plan</span>
                                                            <span className="font-bold text-foreground">₹499 / month</span>
                                                        </div>

                                                        {isPro ? (
                                                            <Button disabled className="w-full font-bold bg-emerald-600 text-white">
                                                                Pro Status Active
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                onClick={() => proCheckoutMutation.mutate()}
                                                                disabled={proCheckoutMutation.isPending}
                                                                className="w-full font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                                                            >
                                                                {proCheckoutMutation.isPending ? (
                                                                    <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                                                                ) : (
                                                                    "Subscribe to EdClarity Pro (₹499/mo)"
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </SidebarMenuItem>
                                    );
                                }

                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            className={buttonClass}
                                            isActive={pathname === item.href}
                                        >
                                            <Link href={item.href}>
                                                {buttonContent}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="gap-2">
                <UserDetailsCard />
                <div className="flex items-center justify-center gap-3 px-2 py-1 text-[11px] text-white/60">
                    <Link href="/terms" className="hover:text-white hover:underline transition-colors">
                        Terms of Service
                    </Link>
                    <span>&bull;</span>
                    <Link href="/privacy" className="hover:text-white hover:underline transition-colors">
                        Privacy Policy
                    </Link>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
};

export default DashboardSidebar;