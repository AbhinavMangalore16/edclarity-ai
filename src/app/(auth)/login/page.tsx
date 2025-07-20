"use client"
import AuthView from "@/modules/auth/views/auth-view"
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from "next/navigation";

const Page = () =>{
    const router = useRouter();
    const {data: session, isPending} = authClient.useSession();
    if (isPending) return <div><CircularProgress/></div>;
    if (session) {
        router.replace("/");
        return null; 
    }
    return <AuthView/>
}

export default Page;