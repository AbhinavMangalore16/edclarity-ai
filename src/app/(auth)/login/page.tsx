import AuthView from "@/modules/auth/views/auth-view"
// import { authClient } from "@/lib/auth-client";
// import CircularProgress from '@mui/material/CircularProgress';
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Page = async () =>{

    const session = await auth.api.getSession({
        headers: await headers(),
    });
    
    if (!!session) {
        redirect("/landing")
    }
    return (
        <div className="relative min-h-screen">
            <Button
                asChild
                variant="ghost"
                className="absolute top-4 left-4 z-50 flex items-center gap-2 text-muted-foreground hover:text-foreground bg-white/50 backdrop-blur-sm hover:bg-white/80"
            >
                <Link href="/">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>
            </Button>
            <AuthView/>
        </div>
    );
}

export default Page;