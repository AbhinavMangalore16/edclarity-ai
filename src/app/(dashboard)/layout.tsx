import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "@/modules/dashboard/ui/components/dashboard-sidebar";
import { DBNavbar } from "@/modules/dashboard/ui/components/db-navbar";
import {NuqsAdapter} from "nuqs/adapters/next"
interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <NuqsAdapter>
      <SidebarProvider>
        <DashboardSidebar />
        <main className="flex flex-col h-screen w-screen bg-muted">
          <DBNavbar />
          {children}
        </main>
      </SidebarProvider>
    </NuqsAdapter>
  );
}
export default Layout;