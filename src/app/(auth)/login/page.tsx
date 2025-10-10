import AuthView from "@/modules/auth/views/auth-view"
// import { authClient } from "@/lib/auth-client";
// import CircularProgress from '@mui/material/CircularProgress';
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const Page = async () =>{

    const session = await auth.api.getSession({
        headers: await headers(),
    });
    
    if (!!session) {
        redirect("/")
    }
    return <AuthView/>
}

export default Page;