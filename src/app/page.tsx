"use client";

import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import Image from "next/image";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import {
	motion,
	useMotionTemplate,
	useMotionValue,
	animate,
} from "framer-motion";
import PageIllustration from "@/components/landing/page-illustration";
import HeroHome from "@/components/landing/hero-home";
import Workflows from "@/components/landing/workflows";
import Features from "@/components/landing/features";
import Cta from "@/components/landing/cta";

const COLORS_TOP = ["#13FFAA", "#1E67C6", "#CE84CF", "#DD335C"];

const Page = () => {
	const color = useMotionValue(COLORS_TOP[0]);

	useEffect(() => {
		const controls = animate(color, COLORS_TOP, {
			ease: "easeInOut",
			duration: 10,
			repeat: Infinity,
			repeatType: "mirror",
		});

		return () => controls.stop();
	}, [color]);

	const backgroundImage = useMotionTemplate`
		radial-gradient(125% 125% at 50% 0%, #020617 50%, ${color})
	`;
	const border = useMotionTemplate`1px solid ${color}`;
	const boxShadow = useMotionTemplate`0px 4px 24px ${color}`;

	return (
		<div className="dark min-h-screen w-full bg-[#020617] text-slate-100">
			<div className="w-full">
				<motion.section
					style={{ backgroundColor: "#020617", backgroundImage }}
					className="relative grid min-h-screen place-content-center overflow-hidden bg-[#020617] px-4 py-24 text-slate-100"
				>
					<div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex justify-center px-4">
						<nav className="pointer-events-auto w-full max-w-5xl rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-[0_20px_50px_rgba(2,6,23,0.45)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/14 sm:px-6">
							<div className="flex items-center justify-between gap-4">
								<Link
									href="/"
									className="group inline-flex items-center gap-3"
								>
									<span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-[0_8px_24px_rgba(2,6,23,0.35)]">
										<Image
											src="/logo-removebg.png"
											width={440}
											height={440}
											alt="EdClarity logo"
										/>
									</span>
									<span className="font-sora text-base font-semibold tracking-tight text-white transition-colors group-hover:text-cyan-200">
										EdClarity.ai
									</span>
								</Link>

								

								<Link
									href="/login"
									className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/20"
								>
									Login
								</Link>
							</div>
						</nav>
					</div>

					<div className="relative z-10 flex flex-col items-center">
						<h1 className="max-w-3xl bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-center text-3xl font-semibold leading-tight text-transparent sm:text-5xl md:text-7xl">
							AI Learning Clarity for Every Student
						</h1>

						<p className="my-6 max-w-xl text-center text-base leading-relaxed text-slate-300 md:text-lg">
							EdClarity.ai combines custom AI tutors, real-time doubt solving,
							and personalized learning workflows to help students learn faster
							with confidence.
						</p>

						<div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
							<Link href="/login">
								<motion.button
									style={{ border, boxShadow }}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(0,0,0,0.38)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20"
								>
									<span className="relative z-10">Get Early Access</span>
									<span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/10 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:bg-slate-950/15">
										<FiArrowRight className="transition-transform duration-200 group-hover:-rotate-45 group-active:-rotate-12" />
									</span>
									<span className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-sky-400/10 to-indigo-500/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
								</motion.button>
							</Link>
						</div>
					</div>

					<div className="absolute inset-0 z-0">
						<Canvas>
							<Stars radius={50} count={2500} factor={4} fade speed={2} />
						</Canvas>
					</div>
				</motion.section>
			</div>
			<PageIllustration />
			<HeroHome />
			<Workflows />
			<Features />
			<Cta />
			<footer className="relative overflow-hidden border-t border-white/10 bg-[#020617]">
				<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
				<div className="pointer-events-none absolute -right-24 bottom-0 opacity-35">
					<Image
						src="/images/footer-illustration.svg"
						width={560}
						height={360}
						alt="Footer illustration"
					/>
				</div>
				<div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
					<div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
						<div className="max-w-md">
							<Link href="/" className="inline-flex items-center gap-3">
								<span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-[0_8px_24px_rgba(2,6,23,0.35)]">
									<Image
										src="/logo-removebg.png"
										width={440}
										height={440}
										alt="EdClarity logo"
									/>
								</span>
								<span className="font-sora text-lg font-semibold tracking-tight text-white">
									EdClarity.ai
								</span>
							</Link>
							<p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
								AI tutors, live doubt solving, transcripts, and session
								summaries built to make learning clearer and faster.
							</p>
						</div>

						<div className="grid gap-8 sm:grid-cols-3">
							<div>
								<h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">
									Product
								</h3>
								<ul className="mt-4 space-y-3 text-sm text-slate-400">
									<li><a href="#" className="transition-colors hover:text-white">AI Tutors</a></li>
									<li><a href="#" className="transition-colors hover:text-white">Live Sessions</a></li>
									<li><a href="#" className="transition-colors hover:text-white">Progress Tracking</a></li>
								</ul>
							</div>
							<div>
								<h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">
									Support
								</h3>
								<ul className="mt-4 space-y-3 text-sm text-slate-400">
									<li><Link href="/login" className="transition-colors hover:text-white">Login</Link></li>
									<li><a href="#" className="transition-colors hover:text-white">Documentation</a></li>
									<li><a href="#" className="transition-colors hover:text-white">Contact</a></li>
								</ul>
							</div>
							<div>
								<h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">
									Launch
								</h3>
								<ul className="mt-4 space-y-3 text-sm text-slate-400">
									<li><a href="#" className="transition-colors hover:text-white">Join Waitlist</a></li>
									<li><a href="#" className="transition-colors hover:text-white">Book Demo</a></li>
									<li><a href="#" className="transition-colors hover:text-white">Privacy</a></li>
								</ul>
							</div>
						</div>
					</div>

					<div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
						<p>© 2026 EdClarity.ai. All rights reserved.</p>
						<p>Personalized learning, live doubt solving, and AI tutoring in one place.</p>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default Page;
