import React, { Suspense } from "react";
import { dehydrate, HydrateOptions } from "@tanstack/react-query";

// Replacing Next.js Link with a standard HTML anchor for environment compatibility
const Link = ({ href, children, className, ...props }: any) => (
  <a href={href} className={className} {...props}>
    {children}
  </a>
);

import { 
  ArrowRight, 
  Terminal, 
  Workflow, 
  Database, 
  Activity, 
  UserCog, 
  Zap,
  GitBranch,
  Network,
  Cpu,
  ChevronRight,
  User
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { caller, getQueryClient, trpc } from "@/trpc/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { Client } from "./client";

// --- Custom CSS & Animations (Injected for portability) ---
const CustomStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-15px); }
    }
    @keyframes float-delayed {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0.2; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-float-delayed { animation: float-delayed 8s ease-in-out 2s infinite; }
    .animate-fade-in-up { animation: fade-in-up 1s ease-out forwards; }
    .delay-100 { animation-delay: 100ms; }
    .delay-200 { animation-delay: 200ms; }
    .delay-300 { animation-delay: 300ms; }
    
    /* Smooth scrolling */
    html { scroll-behavior: smooth; }
  `}} />
);

// --- Starfield Background Component ---
const Starfield = () => {
  // Deterministic star generation for SSR safety (no hydration mismatch)
  const stars = Array.from({ length: 80 }).map((_, i) => ({
    id: i,
    left: `${(i * 23.4) % 100}%`,
    top: `${(i * 17.7) % 100}%`,
    animationDelay: `${(i % 5) * 1.2}s`,
    animationDuration: `${3 + (i % 4)}s`,
    size: i % 4 === 0 ? 'w-1 h-1' : 'w-[2px] h-[2px]',
    opacity: i % 3 === 0 ? 'bg-indigo-300' : 'bg-zinc-400'
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-black"></div>
      {/* Deep space nebula gradients */}
      <div className="absolute left-1/4 top-1/4 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-900/20 blur-[120px]"></div>
      <div className="absolute right-1/4 bottom-1/4 h-[600px] w-[600px] translate-x-1/2 translate-y-1/2 rounded-full bg-purple-900/10 blur-[120px]"></div>
      
      {stars.map((star) => (
        <div
          key={star.id}
          className={`absolute rounded-full ${star.size} ${star.opacity}`}
          style={{
            left: star.left,
            top: star.top,
            animation: `twinkle ${star.animationDuration} ease-in-out infinite`,
            animationDelay: star.animationDelay,
          }}
        />
      ))}
    </div>
  );
};

// --- Minimal UI Components ---
const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.2)] ${className}`}>
    {children}
  </span>
);

const Button = ({ children, variant = "default", className = "", href }: { children: React.ReactNode, variant?: "default" | "outline" | "ghost", className?: string, href?: string }) => {
  const baseStyle = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
  const variants = {
    default: "bg-zinc-50 text-black hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] shadow-sm",
    outline: "border border-zinc-700 bg-black/50 hover:bg-zinc-900 hover:border-zinc-500 text-zinc-100 backdrop-blur-md",
    ghost: "hover:bg-zinc-900/50 text-zinc-300 hover:text-zinc-50"
  };
  
  const combinedClassName = `${baseStyle} ${variants[variant]} ${className}`;
  
  if (href) {
    return <Link href={href} className={combinedClassName}>{children}</Link>;
  }
  return <button className={combinedClassName}>{children}</button>;
};

// --- Page Sections ---
const Navbar = () => (
  <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/40 backdrop-blur-xl">
    <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-400 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-shadow duration-300">
            <Network className="h-4 w-4 text-black" />
          </div>
          <span className="font-bold tracking-tight text-zinc-50 text-lg">Libra</span>
        </Link>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-zinc-400">
          <Link href="/platform" className="hover:text-zinc-50 transition-colors">Platform</Link>
          <Link href="/docs" className="hover:text-zinc-50 transition-colors">Documentation</Link>
          <Link href="/customers" className="hover:text-zinc-50 transition-colors">Customers</Link>
          <Link href="/pricing" className="hover:text-zinc-50 transition-colors">Pricing</Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors hidden sm:block">
          Sign In
        </Link>
        <Button href="/signup" variant="default" className="h-9 px-4 text-sm font-semibold">
          Start Building
        </Button>
      </div>
    </div>
  </header>
);

const Hero = () => (
  <section className="relative overflow-hidden pt-24 pb-32 sm:pt-32 sm:pb-40 border-b border-white/5">
    <Starfield />
    
    <div className="container relative z-10 mx-auto max-w-6xl px-4 sm:px-6 text-center">
      <div className="opacity-0 animate-fade-in-up">
        <Badge className="mb-8">
          <GitBranch className="mr-2 h-3 w-3" />
          Agentic Workflow Orchestration Platform
        </Badge>
      </div>

      <h1 className="mx-auto max-w-5xl text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-50 via-zinc-200 to-zinc-500 sm:text-6xl md:text-7xl lg:text-8xl opacity-0 animate-fade-in-up delay-100 pb-2">
        Autonomous Agents That <br className="hidden sm:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Run Your Workflows</span>
      </h1>

      <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 sm:text-xl leading-relaxed opacity-0 animate-fade-in-up delay-200">
        Build, deploy, and orchestrate AI agents that execute multi-step workflows across your tools — reliably and at scale. From data ingestion to decision execution, Libra turns intent into automated action.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up delay-300">
        <Button href="/signup" className="w-full sm:w-auto h-12 px-8 text-base">
          Start Building Agents
        </Button>
        <Button href="/docs" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base group">
          <Terminal className="mr-2 h-4 w-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          View Documentation
        </Button>
      </div>
    </div>
  </section>
);

const Metrics = () => (
  <section className="relative border-b border-white/5 bg-black/40 backdrop-blur-sm py-14 z-10">
    <div className="container mx-auto max-w-6xl px-4 sm:px-6">
      <p className="text-center text-sm font-medium text-indigo-400/80 uppercase tracking-widest mb-10 drop-shadow-md">
        Designed for AI-native startups and modern enterprises
      </p>
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
        {[
          { label: "Workflows Executed", value: "10M+" },
          { label: "Execution Reliability", value: "99.99%" },
          { label: "Integrations Supported", value: "150+" },
          { label: "Latency (p95)", value: "< 50ms" },
        ].map((metric, i) => (
          <div key={i} className="flex flex-col items-center justify-center space-y-2 text-center group">
            <span className="text-4xl font-bold tracking-tight text-zinc-100 group-hover:text-white group-hover:scale-105 transition-all duration-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              {metric.value}
            </span>
            <span className="text-sm text-zinc-500 font-medium">{metric.label}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const ProblemSolution = () => (
  <section className="relative border-b border-white/5 bg-black py-24 sm:py-32 z-10 overflow-hidden">
    {/* Abstract background glow behind the code block */}
    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

    <div className="container mx-auto max-w-6xl px-4 sm:px-6 relative">
      <div className="grid md:grid-cols-2 gap-16 items-center">
        <div className="animate-fade-in-up">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl mb-6">
            Traditional automation <span className="text-indigo-400">breaks</span> at the edges.
          </h2>
          <div className="space-y-6 text-zinc-400 text-lg leading-relaxed">
            <p>
              Rule-based RPA and basic Zapier workflows fail when faced with unstructured data, ambiguous instructions, or API drift. They require constant maintenance and human intervention.
            </p>
            <p className="text-zinc-100 font-medium border-l-2 border-indigo-500 pl-4 bg-indigo-500/5 py-2 rounded-r-md">
              Libra is different. This is not a simple if/then script.
            </p>
            <p>
              We provide the execution layer where AI models are granted agency. Agents can dynamically plan, handle errors, retry failures, and call your internal APIs to achieve the desired state.
            </p>
          </div>
        </div>
        
        {/* Floating Abstract Technical Visual */}
        <div className="animate-float lg:ml-auto w-full max-w-lg">
          <div className="relative rounded-xl border border-white/10 bg-[#0A0A0B]/80 p-6 shadow-[0_0_40px_rgba(79,70,229,0.15)] backdrop-blur-xl group hover:border-indigo-500/30 transition-colors duration-500">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
              <div className="flex gap-2.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                <div className="h-3 w-3 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                <div className="h-3 w-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              </div>
              <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">libra-execution-trace</span>
            </div>
            <div className="space-y-4 font-mono text-sm sm:text-base leading-relaxed">
              <div className="flex text-zinc-400">
                <span className="text-zinc-600 mr-4 select-none">01</span> 
                <span className="text-blue-400">Agent.plan</span>({`goal: "Resolve billing dispute"`})
              </div>
              <div className="flex text-zinc-400">
                <span className="text-zinc-600 mr-4 select-none">02</span> 
                <span className="text-emerald-400 pl-4 border-l border-white/10 ml-1.5 leading-loose">↳ Tool.call</span>({`api: "stripe.invoices.retrieve"`})
              </div>
              <div className="flex text-zinc-400">
                <span className="text-zinc-600 mr-4 select-none">03</span> 
                <span className="text-red-400 pl-4 border-l border-white/10 ml-1.5 leading-loose">↳ Tool.error</span>({`code: 404, msg: "Not found"`})
              </div>
              <div className="flex text-zinc-400">
                <span className="text-zinc-600 mr-4 select-none">04</span> 
                <span className="text-purple-400 pl-4 border-l border-white/10 ml-1.5 leading-loose">↳ Agent.reason</span>({`"Trying alternate customer email"`})
              </div>
              <div className="flex text-zinc-400">
                <span className="text-zinc-600 mr-4 select-none">05</span> 
                <span className="text-emerald-400 pl-4 border-l border-white/10 ml-1.5 leading-loose">↳ Tool.call</span>({`api: "salesforce.contact.search"`})
              </div>
              <div className="flex text-zinc-400">
                <span className="text-zinc-600 mr-4 select-none">06</span> 
                <span className="text-emerald-400 font-semibold pl-4">↳ Workflow.success</span>({`status: "resolved"`})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Features = () => {
  const features = [
    {
      title: "Multi-Step Orchestration",
      description: "Design agents that plan, reason, and execute complex workflows sequentially or in parallel.",
      icon: <Workflow className="h-6 w-6 text-indigo-300" />
    },
    {
      title: "Tool & API Integrations",
      description: "Connect databases, REST APIs, GraphQL, internal services, CRMs, and custom Python/Node functions.",
      icon: <Database className="h-6 w-6 text-purple-300" />
    },
    {
      title: "Stateful Execution",
      description: "Agents remember context, retry failures gracefully, and manage long-running tasks without dropping state.",
      icon: <Cpu className="h-6 w-6 text-blue-300" />
    },
    {
      title: "Event-Driven Triggers",
      description: "Start workflows automatically from incoming webhooks, cron schedules, user actions, or system events.",
      icon: <Zap className="h-6 w-6 text-amber-300" />
    },
    {
      title: "Observability & Logs",
      description: "Full trace visibility. Replay agent decision trees, debug prompts, and maintain compliance audit trails.",
      icon: <Activity className="h-6 w-6 text-emerald-300" />
    },
    {
      title: "Human-in-the-Loop",
      description: "Add mandatory approval gates, manual overrides, and audit checkpoints for sensitive operations.",
      icon: <UserCog className="h-6 w-6 text-pink-300" />
    }
  ];

  return (
    <section className="relative border-b border-white/5 bg-[#050505] py-24 sm:py-32 z-10">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-16 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            Core capabilities
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Everything you need to build robust, autonomous systems in production. No wrappers, just primitives.
          </p>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="group relative flex flex-col rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all duration-300 hover:-translate-y-2 hover:bg-white/[0.04] hover:shadow-[0_10px_40px_rgba(79,70,229,0.1)] hover:border-indigo-500/20"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 shadow-inner group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="mb-3 text-xl font-semibold text-zinc-100">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const UseCases = () => {
  const cases = [
    {
      title: "AI Operations Copilot",
      desc: "Automate incident response, ticket triage, and on-call escalation without waking up engineers."
    },
    {
      title: "Sales Workflow Automation",
      desc: "Autonomously qualify inbound leads, enrich CRM data via Clearbit, and route high-value opportunities."
    },
    {
      title: "Research & Intelligence",
      desc: "Deploy agents to aggregate market data, summarize lengthy compliance reports, and notify stakeholders."
    },
    {
      title: "Internal Process Automation",
      desc: "Trigger multi-department approvals, sync legacy systems, and update executive dashboards in real-time."
    }
  ];

  return (
    <section className="relative border-b border-white/5 bg-black py-24 sm:py-32 z-10">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
              Built for real business logic
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Replace rigid scripts with intelligent agents that adapt to changing environments.
            </p>
          </div>
          <Button variant="outline" className="hidden md:inline-flex group border-indigo-500/30 hover:bg-indigo-500/10 hover:border-indigo-500/50 text-indigo-100">
            Explore All Use Cases
            <ArrowRight className="ml-2 h-4 w-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {cases.map((uc, i) => (
            <div 
              key={i} 
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-900/50 to-black p-8 hover:border-purple-500/30 transition-all duration-300"
            >
              {/* Subtle hover gradient flare */}
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/0 via-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-100">{uc.title}</h3>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 group-hover:bg-purple-500/20 transition-colors">
                  <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-purple-300 transition-colors" />
                </div>
              </div>
              <p className="relative z-10 mt-4 text-zinc-400 leading-relaxed max-w-md">
                {uc.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQ = () => {
  const faqs = [
    {
      q: "What is an agent?",
      a: "An AI-powered system that can reason, plan, and execute multi-step tasks autonomously. Unlike basic LLM calls, an agent maintains state, utilizes external tools, and iterates based on environmental feedback."
    },
    {
      q: "How is this different from simple automation?",
      a: "Traditional automation follows strict, brittle, deterministic rules. Libra agents dynamically decide next actions based on context, meaning they can handle edge cases, fix errors on the fly, and parse unstructured data."
    },
    {
      q: "Can I connect my own APIs?",
      a: "Yes. You can define custom tools and internal services using standard OpenAPI specs, or directly via our SDK. If it has an endpoint, your agents can use it."
    },
    {
      q: "Is it secure?",
      a: "Libra features enterprise-grade encryption at rest and in transit. Every execution generates a comprehensive audit log, and we support strict role-based access control (RBAC) and data isolation policies."
    }
  ];

  return (
    <section className="bg-[#050505] py-24 sm:py-32 relative z-10">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl text-center mb-12">
          Frequently asked questions
        </h2>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details key={i} className="group rounded-xl border border-white/5 bg-black/50 hover:bg-zinc-900/80 transition-colors [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-zinc-100">
                {faq.q}
                <span className="ml-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 group-hover:bg-white/10 transition-colors duration-200 group-open:rotate-180">
                  <ChevronRight className="h-4 w-4 text-zinc-400 group-open:rotate-90 transition-transform" />
                </span>
              </summary>
              <div className="px-6 pb-6 text-zinc-400 leading-relaxed border-t border-white/5 pt-4 mt-2">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTA = () => (
  <section className="border-t border-white/5 bg-black py-24 sm:py-32 relative overflow-hidden z-10">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black"></div>
    
    {/* Animated Floating Orbs for the CTA */}
    <div className="absolute top-10 left-10 w-32 h-32 bg-purple-600/20 rounded-full blur-[50px] animate-float"></div>
    <div className="absolute bottom-10 right-10 w-40 h-40 bg-indigo-600/20 rounded-full blur-[60px] animate-float-delayed"></div>

    <div className="container relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
      <h2 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 sm:text-5xl">
        Ready to deploy autonomous logic?
      </h2>
      <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto">
        Join hundreds of AI-native companies building the next generation of software on Libra's orchestration layer.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button href="/signup" className="w-full sm:w-auto h-12 px-8 text-base shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          Start Building for Free
        </Button>
        <Button href="/contact" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base">
          Contact Sales
        </Button>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-white/5 bg-[#030303] py-16 relative z-10">
    <div className="container mx-auto max-w-6xl px-4 sm:px-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
        <div className="col-span-2">
          <Link href="/" className="flex items-center space-x-2 mb-6 group">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-zinc-100 to-zinc-400">
              <Network className="h-3.5 w-3.5 text-black" />
            </div>
            <span className="font-bold tracking-tight text-zinc-50 text-lg">Libra</span>
          </Link>
          <p className="text-sm text-zinc-500 max-w-xs mb-8 leading-relaxed">
            Libra is building the execution layer for AI-native companies. Automate complex workflows with confidence.
          </p>
          <div className="flex space-x-5">
            <Link href="https://twitter.com/librasoftware" className="text-zinc-600 hover:text-indigo-400 transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </Link>
            <Link href="https://github.com/libra" className="text-zinc-600 hover:text-indigo-400 transition-colors">
              <span className="sr-only">GitHub</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 mb-5">Product</h3>
          <ul className="space-y-4 text-sm text-zinc-500">
            <li><Link href="/orchestration" className="hover:text-indigo-400 transition-colors">Orchestration</Link></li>
            <li><Link href="/integrations" className="hover:text-indigo-400 transition-colors">Integrations</Link></li>
            <li><Link href="/observability" className="hover:text-indigo-400 transition-colors">Observability</Link></li>
            <li><Link href="/pricing" className="hover:text-indigo-400 transition-colors">Pricing</Link></li>
            <li><Link href="/changelog" className="hover:text-indigo-400 transition-colors">Changelog</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 mb-5">Company</h3>
          <ul className="space-y-4 text-sm text-zinc-500">
            <li><Link href="/about" className="hover:text-indigo-400 transition-colors">About</Link></li>
            <li><Link href="/blog" className="hover:text-indigo-400 transition-colors">Blog</Link></li>
            <li><Link href="/careers" className="hover:text-indigo-400 transition-colors">Careers</Link></li>
            <li><Link href="mailto:support@libra.com" className="hover:text-indigo-400 transition-colors">Contact</Link></li>
            <li><Link href="/security" className="hover:text-indigo-400 transition-colors">Security</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-600">
        <p>&copy; {new Date().getFullYear()} Libra Technologies Inc. All rights reserved.</p>
        <div className="flex space-x-6">
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  </footer>
);

const ActiveUsers = ({ users }: { users: any[] }) => {
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

const Home = async () => {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.getUsers.queryOptions())
  return (
    <div className="min-h-screen bg-black font-sans text-zinc-50 selection:bg-indigo-500/30 selection:text-indigo-100 relative">
      <CustomStyles />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Metrics />
        <HydrationBoundary state={dehydrate(queryClient)}>
          <Suspense fallback={<div className="py-24 text-center text-zinc-500">Loading active users...</div>}>
          <Client />
          </Suspense>
        </HydrationBoundary>
        <ProblemSolution />
        <Features />
        <UseCases />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default Home;