"use client";

import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { BotMessageSquareIcon, DiamondPlusIcon, HeadsetIcon, MegaphoneIcon, VideoIcon, SearchXIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserDetailsCard } from "./user-details-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";

const top = [

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
        icon: SearchXIcon,
        label: "EdClarity.ai",
        href: "/LibraAI",
    }
]

const bottom = [
    {
        icon: DiamondPlusIcon,
        label: "Upgrade to EdClarity Pro",
        href: "/pro",
    },
    {
        icon: MegaphoneIcon,
        label: "Dev Announcements",
        href: "/announcements",
    },
    {
        icon: HeadsetIcon,
        label: "Support",
        href: "/support",
    }
]
export const DashboardSidebar = () => {
    const pathname = usePathname();
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
                            {top.map((item) => (
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
                                const isPro = item.href === "/pro";
                                const buttonContent = (
                                    <span className="flex items-center gap-2">
                                        <item.icon className="w-5 h-5" />
                                        {item.label}
                                    </span>
                                );
                                const buttonClass = cn(
                                    "h-10 rounded-md transition-colors duration-200 px-3 py-2 font-medium text-white w-full text-left flex items-center",
                                    pathname === item.href && !isPro
                                        ? "bg-[oklch(0.32_0.14_283.1)] shadow-inner border border-[oklch(0.5_0.1_283.1)]"
                                        : "hover:bg-[oklch(0.28_0.12_283.1)] hover:border-[oklch(0.5_0.1_283.1)] border border-transparent"
                                );

                                if (isPro) {
                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <SidebarMenuButton className={buttonClass} isActive={false}>
                                                        {buttonContent}
                                                    </SidebarMenuButton>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-purple-100 dark:border-purple-900/30">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                                            <DiamondPlusIcon className="w-6 h-6 text-purple-600" />
                                                            EdClarity Pro
                                                        </DialogTitle>
                                                        <DialogDescription>
                                                            Upgrade to Pro and unlock the full potential of your EdClarity experience.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="flex flex-col gap-4 py-4">
                                                        <div className="flex items-start gap-3">
                                                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100">Advanced AI Models</p>
                                                                <p className="text-sm text-gray-500">Get access to premium, state-of-the-art language models for better reasoning.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100">Unlimited Queries</p>
                                                                <p className="text-sm text-gray-500">Remove limits on RAG and EdTutors interactions across all your meetings.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100">Priority Support</p>
                                                                <p className="text-sm text-gray-500">Skip the queue with faster response times and dedicated assistance.</p>
                                                            </div>
                                                        </div>
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
            <SidebarFooter>
                <UserDetailsCard />
            </SidebarFooter>
        </Sidebar>

    )
};
export default DashboardSidebar;