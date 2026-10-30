"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Scale,
  Sparkles,
  Search,
  CheckCircle,
  HelpCircle,
  Lock,
  Zap,
  Globe,
  ChevronRight,
  Printer,
  Copy,
  Check,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function TermsOfServicePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("acceptance");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lastUpdated = "August 13, 2026";

  const termsSections = [
    {
      id: "acceptance",
      icon: Scale,
      title: "1. Acceptance of Terms",
      summary: "By accessing EdClarity.ai, you agree to these legal terms. Please read them thoroughly.",
      content:
        "By creating an account, accessing, or using EdClarity.ai ('Service', 'Platform', 'we', 'us', or 'our'), you agree to be legally bound by these Terms of Service and all incorporated policies. If you do not agree with any portion of these terms, you must immediately discontinue use of the Service.",
    },
    {
      id: "description",
      icon: Zap,
      title: "2. Description of Service",
      summary: "EdClarity.ai provides AI-driven learning tools, real-time collaboration, and document clarity engines.",
      content:
        "EdClarity.ai is an intelligent educational workspace offering AI-driven document synthesis, interactive flashcards, meeting transcriptions, real-time study rooms, and personalized learning analytics. We continually refine our features and reserve the right to modify or enhance platform capabilities with advance notice.",
    },
    {
      id: "accounts",
      icon: Lock,
      title: "3. Account Security & Responsibilities",
      summary: "Keep your credentials secure. You are responsible for all activity under your user profile.",
      content:
        "You are solely responsible for safeguarding your login credentials (passwords, social login tokens, and API keys). Any activity conducted under your account remains your responsibility. You agree to notify EdClarity.ai immediately if you suspect unauthorized access or security breaches.",
    },
    {
      id: "acceptable-use",
      icon: ShieldCheck,
      title: "4. Acceptable Use Policy",
      summary: "No unauthorized scraping, reverse-engineering, harassment, or malicious activity is permitted.",
      content:
        "You agree not to upload harmful, infringing, or illegal material. You may not attempt to reverse engineer, disrupt, automated-scrape, or exploit the underlying AI models, infrastructure, or network endpoints of EdClarity.ai.",
    },
    {
      id: "intellectual-property",
      icon: FileText,
      title: "5. Intellectual Property Rights",
      summary: "You retain 100% ownership of your uploaded study material. Platform features belong to EdClarity.ai.",
      content:
        "All software code, brand identities, logos, interfaces, and proprietary algorithms of EdClarity.ai remain the exclusive property of EdClarity.ai. You retain full ownership of all original documents, notes, and study assets uploaded to your personal workspace.",
    },
    {
      id: "ai-disclaimer",
      icon: HelpCircle,
      title: "6. AI Generation, Safety Guardrails & Educational Disclaimer",
      summary: "AI model outputs are protected by real-time guardrails and intended as educational aids.",
      content:
        "EdClarity.ai utilizes state-of-the-art generative language models guarded by automated prompt-injection defenses, PII redaction, and Human-in-the-Loop quality auditing. While we maintain rigorous quality standards, AI outputs are intended for educational assistance and should be cross-referenced for academic or professional applications.",
    },
    {
      id: "payments-and-creators",
      icon: Sparkles,
      title: "7. Course Purchases, Pro Subscriptions & Creator Revenue",
      summary: "Payments are processed securely via Dodo Payments; course creators earn an 85% revenue share.",
      content:
        "Course enrollments and EdClarity Pro subscriptions are billed through our payment processor, Dodo Payments. Verified instructors publishing premium courses on the EdClarity LMS receive an 85% creator revenue share on net sales, with a 15% platform fee supporting hosting, AI inference, and payment processing.",
    },
    {
      id: "termination",
      icon: Globe,
      title: "8. Termination & Account Cancellation",
      summary: "You can delete your account anytime. Severe violations may result in account suspension.",
      content:
        "You may request account deletion at any time from your settings. We reserve the right to suspend or terminate accounts that engage in repeated abuse, fraud, or violations of our acceptable use guidelines.",
    },
    {
      id: "liability",
      icon: Scale,
      title: "9. Limitation of Liability",
      summary: "EdClarity.ai is provided 'as is'. Our liability is limited to the maximum extent permitted by law.",
      content:
        "To the maximum extent permitted by applicable law, EdClarity.ai and its creators shall not be liable for indirect, incidental, or consequential damages arising from service usage or temporary service interruptions.",
    },
  ];

  // Scroll spy active section observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    termsSections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const filteredSections = termsSections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/terms#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Section link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="dark min-h-screen w-full bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 relative overflow-hidden">
      {/* Dynamic Background Glow Overlays */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-cyan-500/10 via-indigo-500/10 to-purple-500/10 rounded-full blur-[140px]" />

      {/* Floating Header Navbar */}
      <header className="sticky top-6 z-50 px-4 sm:px-6">
        <nav className="w-full max-w-6xl mx-auto rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-[0_20px_50px_rgba(2,6,23,0.45)] backdrop-blur-xl transition-all duration-300 hover:border-white/30">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-[0_8px_24px_rgba(2,6,23,0.35)]">
                <Image
                  src="/logo-removebg.png"
                  width={36}
                  height={36}
                  alt="EdClarity logo"
                  className="object-contain"
                />
              </span>
              <span className="font-sora text-base font-semibold tracking-tight text-white transition-colors group-hover:text-cyan-200">
                EdClarity.ai
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden font-sora gap-2 text-xs text-slate-300 hover:text-white border border-white/15"
              >
                <List className="h-4 w-4 text-cyan-400" />
                <span>Topics</span>
              </Button>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-sora gap-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Sign In</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="hidden sm:inline-flex font-sora items-center gap-2 border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/15">
            <h3 className="font-sora text-sm font-bold text-cyan-300 uppercase tracking-wider">
              Terms Topics
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
              Close &times;
            </Button>
          </div>
          <div className="overflow-y-auto space-y-1.5 flex-1">
            {termsSections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-xs py-2.5 px-3.5 rounded-xl font-sora transition-all ${
                  activeSection === sec.id
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold border-l-2 border-cyan-400"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {sec.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Hero Header Section */}
      <section className="relative pt-16 pb-8 px-4 sm:px-6 max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md font-sora text-xs font-medium text-cyan-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <Scale className="h-3.5 w-3.5 text-cyan-400" />
          <span>Legal Center & Guidelines</span>
        </div>

        <h1 className="font-sora max-w-3xl mx-auto text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-tight">
          Terms of Service
        </h1>

        <p className="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed">
          Please read these terms carefully before using the EdClarity.ai platform. Last updated on{" "}
          <span className="font-sora text-cyan-300 font-semibold">{lastUpdated}</span>.
        </p>

        {/* Tab Switcher & Search Bar */}
        <div className="pt-2 max-w-md mx-auto space-y-4">
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/15 backdrop-blur-xl">
            <Link href="/terms" className="flex-1">
              <button
                className={`w-full py-2.5 font-sora text-xs font-semibold rounded-xl transition-all ${
                  activeTab === "terms"
                    ? "bg-white text-slate-950 shadow-[0_4px_20px_rgba(255,255,255,0.2)]"
                    : "text-slate-300 hover:text-white"
                }`}
                onClick={() => setActiveTab("terms")}
              >
                Terms of Service
              </button>
            </Link>
            <Link href="/privacy" className="flex-1">
              <button
                className={`w-full py-2.5 font-sora text-xs font-semibold rounded-xl transition-all ${
                  activeTab === "privacy"
                    ? "bg-white text-slate-950 shadow-[0_4px_20px_rgba(255,255,255,0.2)]"
                    : "text-slate-300 hover:text-white"
                }`}
                onClick={() => setActiveTab("privacy")}
              >
                Privacy Policy
              </button>
            </Link>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search terms, guidelines, or conditions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white/5 border-white/15 text-slate-100 text-xs rounded-xl focus:ring-2 focus:ring-cyan-400/40 backdrop-blur-md placeholder:text-slate-400"
            />
          </div>
        </div>
      </section>

      {/* Main Content Layout with Fixed Left Sidebar */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-start">
        {/* Table of Contents Sidebar - Fixed Sticky Left */}
        <aside className="hidden lg:block lg:col-span-4 space-y-4 sticky top-24 self-start">
          <div className="p-5 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-2xl space-y-3">
            <h3 className="font-sora text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-cyan-400" />
              Table of Contents
            </h3>
            <nav className="space-y-1">
              {termsSections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className={`block text-xs py-2.5 px-3 rounded-xl transition-all truncate flex items-center justify-between group font-sora ${
                    activeSection === sec.id
                      ? "bg-cyan-500/20 text-white font-semibold border-l-2 border-cyan-400 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="truncate">{sec.title}</span>
                  <ChevronRight className={`h-3 w-3 transition-opacity text-cyan-300 shrink-0 ${activeSection === sec.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                </a>
              ))}
            </nav>
          </div>

          <div className="p-5 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 to-indigo-950/40 backdrop-blur-xl text-xs space-y-2 shadow-xl">
            <p className="font-sora font-semibold text-cyan-200">Questions or inquiries?</p>
            <p className="text-slate-300">Our compliance team is here to assist you anytime.</p>
            <a
              href="mailto:support@edclarity.ai"
              className="font-sora text-cyan-300 hover:underline font-medium inline-block pt-1"
            >
              support@edclarity.ai &rarr;
            </a>
          </div>
        </aside>

        {/* Content Section Cards */}
        <section className="lg:col-span-8 space-y-6">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-slate-300">
              <p className="text-sm">No legal sections match your query "{searchQuery}".</p>
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="mt-3 font-sora text-cyan-300">
                Clear Search Filter
              </Button>
            </div>
          ) : (
            filteredSections.map((sec) => {
              const IconComp = sec.icon;
              return (
                <article
                  key={sec.id}
                  id={sec.id}
                  className="group p-6 sm:p-7 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:border-white/25 shadow-xl space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                        <IconComp className="h-5 w-5" />
                      </div>
                      <h2 className="font-sora text-lg font-semibold text-white group-hover:text-cyan-200 transition-colors">
                        {sec.title}
                      </h2>
                    </div>

                    <button
                      onClick={() => handleCopyLink(sec.id)}
                      title="Copy section link"
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
                    >
                      {copiedId === sec.id ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Summary Box */}
                  <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/20 text-xs text-cyan-100/90 leading-relaxed flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-sora font-bold text-cyan-300 uppercase tracking-wider text-[10px] block mb-0.5">
                        Key Takeaway
                      </span>
                      {sec.summary}
                    </div>
                  </div>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pt-1">
                    {sec.content}
                  </p>
                </article>
              );
            })
          )}

          {/* Footer Card */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-center space-y-3">
            <p className="text-xs text-slate-300">
              Have additional questions about our Terms of Service? We are committed to absolute transparency.
            </p>
            <div className="flex justify-center gap-4 text-xs font-sora font-medium">
              <Link href="/privacy" className="text-cyan-300 hover:underline">
                View Privacy Policy
              </Link>
              <span className="text-slate-600">&bull;</span>
              <a href="mailto:support@edclarity.ai" className="text-cyan-300 hover:underline">
                Contact Legal Support
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
