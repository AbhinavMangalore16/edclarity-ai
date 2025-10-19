import { useAgentFilter } from "@/modules/agentic/hooks/useAgenticFilter"
import { Input } from "../ui/input";
import { SearchIcon } from "lucide-react";


export const AgenticFilter = () => {
    const [filters, setFilters] = useAgentFilter();
    return (
        <div className="relative">
            <Input placeholder="Filter by name.."
                className="h-9 bg-white w-[300px] pl-8"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
            />
            <SearchIcon className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
    )
}