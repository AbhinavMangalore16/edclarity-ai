"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { User } from "lucide-react";

export const Client = ()=>{
    const trpc = useTRPC();
    const {data: users} = useSuspenseQuery(trpc.getUsers.queryOptions());
  return (
    <section className="relative border-b border-white/5 bg-[#050505] py-24 sm:py-32 z-10 overflow-hidden">
      {/* Abstract glow */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            Join <span className="text-indigo-400">{users.length}</span> active users building the future
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Trusted by visionary builders and operators across the globe.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          {users.map((user, i) => (
            <div 
              key={i} 
              className="group flex items-center gap-3 rounded-full border border-white/5 bg-white/[0.02] px-4 py-2 hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${(i % 10) * 100}ms` }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                <User className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                {user.name || "Anonymous Builder"}
              </span>
            </div>
          ))}
          
          {users.length === 0 && (
            <div className="text-zinc-500 text-sm italic w-full text-center">
              No users found yet. Be the first to join!
            </div>
          )}
        </div>
      </div>
    </section>
  );
};