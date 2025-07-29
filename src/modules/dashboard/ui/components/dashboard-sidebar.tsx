"use client";

import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { BotMessageSquareIcon, DiamondPlusIcon, HeadsetIcon, MegaphoneIcon, VideoIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserDetailsCard } from "./user-details-card";

const top = [

    {
        icon: VideoIcon,
        label: "Your Meetings",
        href: "/meetings",
    },
    {
        icon: BotMessageSquareIcon,
        label: "Your EdAgents",
        href: "/edagents",
    },
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
                            {bottom.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        className={cn(
                                            "h-10 rounded-md transition-colors duration-200 px-3 py-2 font-medium text-white",
                                            pathname === item.href
                                                ? "bg-[oklch(0.32_0.14_283.1)] shadow-inner border border-[oklch(0.5_0.1_283.1)]"
                                                : "hover:bg-[oklch(0.28_0.12_283.1)] hover:border-[oklch(0.5_0.1_283.1)] border border-transparent"
                                        )}
                                        isActive={pathname === item.href}
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
            </SidebarContent>
            <SidebarFooter>
                <UserDetailsCard/>
            </SidebarFooter>
        </Sidebar>

    )
};
export default DashboardSidebar;