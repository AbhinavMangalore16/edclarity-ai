"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Eye,
  Sparkles,
  Search,
  CheckCircle,
  Database,
  UserCheck,
  Cookie,
  Mail,
  ChevronRight,
  Printer,
  Copy,
  Check,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PrivacyPolicyPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("privacy");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("information-collection");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lastUpdated = "August 13, 2026";

  const privacySections = [
    {
      id: "information-collection",
      icon: Database,
      title: "1. Information We Collect",
      summary: "Account credentials, study documents, interactive queries, and technical diagnostics.",
      content:
        "We collect personal information you explicitly provide during registration (name, email address, password hash, OAuth provider data), uploaded study notes, document files, and queries sent to EdClarity AI tools. Additionally, we log standard technical metadata (IP address, browser user-agent, operating system) for security diagnostics and performance optimization.",
    },
    {
      id: "usage",
      icon: Sparkles,
      title: "2. How We Use Your Information",
      summary: "Delivering core AI features, generating flashcards, and maintaining platform security.",
      content:
        "Your data is processed strictly to deliver, personalize, and improve EdClarity.ai services. This includes generating automated document summaries, constructing interactive flashcard sets, powering real-time meeting transcription, and preventing fraudulent or unauthorized access.",
    },
    {
      id: "ai-privacy",
      icon: Lock,
      title: "3. AI Privacy, PII Redaction & Document Protection",
      summary: "Sensitive PII is automatically scrubbed before LLM inference, and your documents never train public models.",
      content:
        "We prioritize the confidentiality of your intellectual workspace. Before queries reach external language model providers, our AI Gateway automatically redacts sensitive personally identifiable information (emails, phone numbers, government IDs, and payment card numbers). Your study notes, uploaded PDFs, and AI chat histories are NEVER sold to data brokers or used to train public foundation AI models.",
    },
    {
      id: "third-party",
      icon: ShieldCheck,
      title: "4. Third-Party Infrastructure & Processors",
      summary: "We partner only with SOC-2 compliant cloud infrastructure and AI model providers.",
      content:
        "To provide reliable real-time services, we partner with trusted infrastructure providers (cloud database hosting, authentication gateways, and API providers). All third-party sub-processors adhere to stringent security standards and data protection agreements.",
    },
    {
      id: "security",
      icon: Eye,
      title: "5. Data Security & Storage Standards",
      summary: "Bank-grade encryption (TLS in transit, AES-256 at rest) safeguards all stored data.",
      content:
        "We implement industry-leading encryption protocols for all data transmission (TLS 1.3/HTTPS) and database storage (AES-256). Access control mechanisms ensure that your personal workspace data remains strictly isolated to your account.",
    },
    {
      id: "user-rights",
      icon: UserCheck,
      title: "6. Your Rights & Data Portability",
      summary: "You can request account data export or complete account deletion at any time.",
      content:
        "You maintain full ownership of your personal data. You have the right to request a complete export of your account data or request permanent account deletion at any time by accessing your account settings or contacting our data protection officer.",
    },
    {
      id: "cookies",
      icon: Cookie,
      title: "7. Cookies & Session Storage",
      summary: "Essential tokens are used strictly for authentication and security state management.",
      content:
        "We utilize essential session cookies and localized storage tokens to maintain secure user login states, remember theme preferences, and prevent cross-site request forgery (CSRF). We do not deploy intrusive third-party advertising cookies.",
    },
    {
      id: "contact",
      icon: Mail,
      title: "8. Contact Privacy Team",
      summary: "Direct line to our Data Protection Officer for inquiries or privacy requests.",
      content:
        "If you have questions, feedback, or formal privacy requests regarding this policy, please reach out directly to our Data Protection Officer at privacy@edclarity.ai.",
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

    privacySections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const filteredSections = privacySections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/privacy#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Section link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="dark min-h-screen w-full bg-[#020617] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      {/* Dynamic Background Glow Overlays */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-emerald-500/10 via-teal-500/10 to-indigo-500/10 rounded-full blur-[140px]" />

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
              <span className="font-sora text-base font-semibold tracking-tight text-white transition-colors group-hover:text-emerald-200">
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
                <List className="h-4 w-4 text-emerald-400" />
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

      {/* Mobile Drawer Navigation for Topics */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/15">
            <h3 className="font-sora text-sm font-bold text-emerald-300 uppercase tracking-wider">
              Privacy Topics
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
              Close &times;
            </Button>
          </div>
          <div className="overflow-y-auto space-y-1.5 flex-1">
            {privacySections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-xs py-2.5 px-3.5 rounded-xl font-sora transition-all ${
                  activeSection === sec.id
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold border-l-2 border-emerald-400"
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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md font-sora text-xs font-medium text-emerald-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Privacy & Transparency</span>
        </div>

        <h1 className="font-sora max-w-3xl mx-auto text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-tight">
          Privacy Policy
        </h1>

        <p className="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed">
          Learn how we collect, protect, and manage your personal data with bank-grade security. Last updated on{" "}
          <span className="font-sora text-emerald-300 font-semibold">{lastUpdated}</span>.
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
              placeholder="Search privacy topics, data protection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white/5 border-white/15 text-slate-100 text-xs rounded-xl focus:ring-2 focus:ring-emerald-400/40 backdrop-blur-md placeholder:text-slate-400"
            />
          </div>
        </div>
      </section>

      {/* Main Content Layout with Fixed Left Sidebar */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-start">
        {/* Table of Contents Sidebar - Fixed Sticky Left */}
        <aside className="hidden lg:block lg:col-span-4 space-y-4 sticky top-24 self-start">
          <div className="p-5 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-2xl space-y-3">
            <h3 className="font-sora text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              Privacy Topics
            </h3>
            <nav className="space-y-1">
              {privacySections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className={`block text-xs py-2.5 px-3 rounded-xl transition-all truncate flex items-center justify-between group font-sora ${
                    activeSection === sec.id
                      ? "bg-emerald-500/20 text-white font-semibold border-l-2 border-emerald-400 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="truncate">{sec.title}</span>
                  <ChevronRight className={`h-3 w-3 transition-opacity text-emerald-300 shrink-0 ${activeSection === sec.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                </a>
              ))}
            </nav>
          </div>

          <div className="p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-teal-950/40 backdrop-blur-xl text-xs space-y-2 shadow-xl">
            <p className="font-sora font-semibold text-emerald-200">Data Protection Officer</p>
            <p className="text-slate-300">Have questions regarding your personal data rights?</p>
            <a
              href="mailto:privacy@edclarity.ai"
              className="font-sora text-emerald-300 hover:underline font-medium inline-block pt-1"
            >
              privacy@edclarity.ai &rarr;
            </a>
          </div>
        </aside>

        {/* Content Section Cards */}
        <section className="lg:col-span-8 space-y-6">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-slate-300">
              <p className="text-sm">No privacy topics match your query "{searchQuery}".</p>
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="mt-3 font-sora text-emerald-300">
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
                      <div className="p-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                        <IconComp className="h-5 w-5" />
                      </div>
                      <h2 className="font-sora text-lg font-semibold text-white group-hover:text-emerald-200 transition-colors">
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
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-xs text-emerald-100/90 leading-relaxed flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-sora font-bold text-emerald-300 uppercase tracking-wider text-[10px] block mb-0.5">
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
              Questions regarding privacy or data security? We are here to help anytime.
            </p>
            <div className="flex justify-center gap-4 text-xs font-sora font-medium">
              <Link href="/terms" className="text-emerald-300 hover:underline">
                View Terms of Service
              </Link>
              <span className="text-slate-600">&bull;</span>
              <a href="mailto:privacy@edclarity.ai" className="text-emerald-300 hover:underline">
                Contact Privacy Team
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
