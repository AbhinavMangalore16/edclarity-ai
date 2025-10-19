import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import HomePageView from "@/modules/home/views/home-view";


const Page = async () => {

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session){
    redirect("/login");
  }
  return <HomePageView/>;
}

export default Page;  