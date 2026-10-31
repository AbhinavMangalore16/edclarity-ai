"use client";

import { useState, forwardRef, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import clsx from "clsx";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn, FieldValues } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { TriangleAlertIcon, ShieldCheck, CheckCircle2, RefreshCw, KeyRound } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { OTPVerification } from "@/components/ui/otp-verify";

const signInZodSchema = z.object({
    email: z.string().email(),
    password: z.string().min(4, { message: "Kindly enter password correctly! (minimum length 6)" })
});

const signUpZodSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email(),
    password: z.string().min(6, { message: "Password is mandatory!" }),
    confirmPassword: z.string().min(6, { message: "Password required for confirmation" })
}).refine((data) => data.password === data.confirmPassword, {
    message: "Given passwords do not match.",
    path: ["confirmPassword"]
});

type SocialHandlers = {
    google?: () => void;
    microsoft?: () => void;
    github?: () => void;
    apple?: () => void;
};

interface SignFormProps<T extends FieldValues> {
    form: UseFormReturn<T>;
    pending: boolean;
    error: string | null;
    onSubmit: (data: T) => void;
    onSwitch: () => void;
    onForgot?: () => void;
    socialDisabled?: boolean;
    socialHandlers?: SocialHandlers;
    isMobile: boolean;
}

export const PasswordInput = forwardRef<
    HTMLInputElement,
    React.ComponentProps<typeof Input>
>(function PasswordInput({ className, ...props }, ref) {
    const [show, setShow] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    function setRefs(el: HTMLInputElement) {
        inputRef.current = el;
        if (typeof ref === "function") {
            ref(el);
        } else if (ref) {
            (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
        }
    }
    function togglePassword() {
        const input = inputRef.current;
        if (!input) return;

        const { selectionStart, selectionEnd } = input;

        setShow((prev) => !prev);
        requestAnimationFrame(() => {
            if (input.selectionStart !== null && selectionStart !== null) {
                input.setSelectionRange(selectionStart, selectionEnd!);
            }
        });
    }

    return (
        <div className="relative w-full">
            <Input
                {...props}
                ref={setRefs}
                type={show ? "text" : "password"}
                className={clsx("pr-10", className)}
            />
            <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={togglePassword}
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
            >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );
});

// Reusable SignInForm component
function SignInForm({ form, pending, error, onSubmit, onSwitch, onForgot, socialDisabled, socialHandlers, isMobile }: SignFormProps<z.infer<typeof signInZodSchema>>) {
    return (
        <Form {...form}>
            <form className={isMobile ? "flex flex-col items-center text-center w-full" : "p-6"} onSubmit={form.handleSubmit(onSubmit)}>
                <h2 className={isMobile ? "text-2xl font-bold text-center mb-4" : "text-2xl font-bold mb-6 text-center"}>Sign In</h2>
                <div className={isMobile ? "flex flex-col gap-4 w-full mb-2" : "flex flex-col gap-4 w-full mb-6"}>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="lorem@ipsum.com" className="w-full" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center justify-between">
                                <FormLabel>Password</FormLabel>
                                <button
                                    type="button"
                                    onClick={onForgot}
                                    className="text-xs text-blue-600 hover:underline font-medium focus:outline-none"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <FormControl>
                                <Input type="password" placeholder="********" className="w-full" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <Button disabled={pending} type="submit" className="w-full px-4 mb-4">Sign In</Button>
                <div className="relative text-center text-sm my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-muted-foreground/30" />
                    </div>
                    <span className="relative z-10 bg-white dark:bg-background px-2 text-muted-foreground">or continue with</span>
                </div>
                <div className={isMobile ? "flex flex-row gap-2 w-full mb-4" : "flex flex-row gap-2 w-full mb-4"}>
                    <Button disabled={socialDisabled} type="button" variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={socialHandlers?.google}><FcGoogle /></Button>
                    <Button disabled={socialDisabled} type="button" variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={() => { authClient.signIn.social({ provider: "github", callbackURL: "/LibraAI" }) }}><FaGithub /></Button>
                </div>
                <div className="text-center">
                    <Button variant="link" onClick={onSwitch} className="text-blue-600" type="button">Don&apos;t have an account? Sign Up</Button>
                </div>
                {!!error && (
                    <Alert className="bg-destructive/20 border-accent m-2">
                        <TriangleAlertIcon className="!text-destructive" />
                        {error}
                    </Alert>
                )}
            </form>
        </Form>
    );
}

// Reusable SignUpForm component
function SignUpForm({ form, pending, error, onSubmit, onSwitch, socialDisabled, socialHandlers, isMobile }: SignFormProps<z.infer<typeof signUpZodSchema>>) {
    return (
        <Form {...form}>
            <form className={isMobile ? "flex flex-col items-center text-center w-full" : "p-6"} onSubmit={form.handleSubmit(onSubmit)}>
                <h2 className={isMobile ? "text-2xl font-bold text-center mb-4" : "text-2xl font-bold mb-6 text-center"}>Create Account</h2>
                <div className={isMobile ? "flex flex-col gap-4 w-full mb-2" : "flex flex-col gap-4 w-full mb-6"}>
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input type="text" placeholder="Full Name" className="w-full" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="lorem@ipsum.com" className="w-full" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <PasswordInput placeholder="********" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                                <PasswordInput placeholder="********" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <Button disabled={pending} type="submit" className="w-full px-4 mb-4">
                    {pending ? "Sending Verification Code..." : "Sign Up & Authorize Email"}
                </Button>
                <div className="relative text-center text-sm my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-muted-foreground/30" />
                    </div>
                    <span className="relative z-10 bg-white dark:bg-background px-2 text-muted-foreground">or continue with</span>
                </div>
                <div className={isMobile ? "flex flex-row gap-2 w-full mb-4" : "flex flex-row gap-2 w-full mb-4"}>
                    <Button disabled={socialDisabled} type="button" variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={socialHandlers?.google}><FcGoogle /></Button>
                    <Button disabled={socialDisabled} type="button" variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={socialHandlers?.github}><FaGithub /></Button>
                </div>
                <div className="text-center">
                    <Button variant="link" onClick={onSwitch} className="text-blue-600" type="button">Already have an account? Sign In</Button>
                </div>
                {!!error && (
                    <Alert className="bg-destructive/20 border-accent m-2">
                        <TriangleAlertIcon className="!text-destructive" />
                        {error}
                    </Alert>
                )}
            </form>
        </Form>
    );
}

export default function AuthView() {
    const signInForm = useForm<z.infer<typeof signInZodSchema>>({
        resolver: zodResolver(signInZodSchema),
        defaultValues: {
            email: "",
            password: ""
        }
    });

    const signUpForm = useForm<z.infer<typeof signUpZodSchema>>({
        resolver: zodResolver(signUpZodSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: ""
        }
    });

    const router = useRouter();
    const [error, setError] = useState<string | null>("");
    const [errorS, setErrorS] = useState<string | null>("");
    const [pending, setPending] = useState(false);
    const [isSigningUp, setIsSigningUp] = useState(false);

    // Modal States for Forgot Password & Email Verification OTP
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [forgotStep, setForgotStep] = useState<"email" | "reset_otp" | "new_password" | "success">("email");
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotOtp, setForgotOtp] = useState("");
    const [securityAnswer, setSecurityAnswer] = useState("");
    const [securityQuestion, setSecurityQuestion] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState<string | null>(null);

    // Sign-Up OTP Verification State
    const [isSignUpOtpModalOpen, setIsSignUpOtpModalOpen] = useState(false);
    const [signUpPendingData, setSignUpPendingData] = useState<{ name: string; email: string; password: string } | null>(null);
    const [signUpOtpInput, setSignUpOtpInput] = useState("");
    const [signUpOtpLoading, setSignUpOtpLoading] = useState(false);
    const [devSignUpOtp, setDevSignUpOtp] = useState<string | null>(null);
    const [devForgotOtp, setDevForgotOtp] = useState<string | null>(null);

    const { data: session } = authClient.useSession();

    // Trigger Sign-Up with Resend OTP Code
    const handleSignUp = async (data: z.infer<typeof signUpZodSchema>) => {
        setErrorS(null);
        setPending(true);

        try {
            const res = await fetch("/api/auth/send-signup-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
            });
            const resData = await res.json();
            if (!res.ok) throw new Error(resData.error || "Failed to send verification code");

            setSignUpPendingData({ name: data.name, email: data.email, password: data.password });

            if (resData.disabled) {
                // Feature flag enabled: Bypass verification modal completely
                toast.success("Verification Bypassed (Feature Flag Active). Creating Account...");
                await handleVerifySignUpOtpCodeDirectly("123456", { name: data.name, email: data.email, password: data.password });
                return;
            }

            if (resData.devOtp) {
                setDevSignUpOtp(resData.devOtp);
            }
            setIsSignUpOtpModalOpen(true);
            toast.success(`Verification code sent to ${data.email}  !`);
        } catch (err: any) {
            setErrorS(err.message);
            toast.error(err.message);
        } finally {
            setPending(false);
        }
    };

    const handleVerifySignUpOtpCodeDirectly = async (code: string, customData?: { name?: string; email: string; password?: string }) => {
        const payloadData = customData || signUpPendingData;
        if (!payloadData || !code.trim()) return;

        setSignUpOtpLoading(true);
        setErrorS(null);

        try {
            const res = await fetch("/api/auth/verify-signup-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: payloadData.email,
                    otpCode: code.trim(),
                    name: payloadData.name,
                    password: payloadData.password,
                }),
            });
            const resData = await res.json();
            if (!res.ok) throw new Error(resData.error || "Invalid verification code");

            toast.success("Account Created Successfully! 🎉");
            setIsSignUpOtpModalOpen(false);

            // Auto sign-in and redirect to dashboard
            if (payloadData.password) {
                authClient.signIn.email(
                    { email: payloadData.email.trim().toLowerCase(), password: payloadData.password },
                    {
                        onSuccess: () => {
                            window.location.href = "/LibraAI";
                        },
                        onError: (ctx) => {
                            console.warn("SignIn callback notice, using session cookie from verify-signup-otp:", ctx.error);
                            window.location.href = "/LibraAI";
                        },
                    }
                );
            } else {
                window.location.href = "/LibraAI";
            }
        } catch (err: any) {
            setErrorS(err.message);
            toast.error(err.message);
        } finally {
            setSignUpOtpLoading(false);
        }
    };

    const handleVerifySignUpOtpCode = async (code: string) => {
        await handleVerifySignUpOtpCodeDirectly(code);
    };

    // Forgot Password Request Code
    const handleRequestForgotOtp = async (emailToUse?: string) => {
        const targetEmail = emailToUse || forgotEmail;
        if (!targetEmail.trim()) return;

        setForgotLoading(true);
        setForgotError(null);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: targetEmail }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate reset code");

            setSecurityQuestion(data.securityQuestion || "Enter 6-digit verification code");
            if (data.devOtpCode) {
                setDevForgotOtp(data.devOtpCode);
            }
            toast.success("Password reset code sent to your email  !");
            setForgotStep("reset_otp");
        } catch (err: any) {
            setForgotError(err.message);
        } finally {
            setForgotLoading(false);
        }
    };

    // Forgot Password Reset Submission
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotOtp && !securityAnswer) {
            setForgotError("Please enter OTP code or Security Answer");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setForgotError("Passwords do not match");
            return;
        }

        setForgotLoading(true);
        setForgotError(null);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: forgotEmail,
                    otpCode: forgotOtp,
                    securityAnswer,
                    newPassword,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to reset password");

            toast.success("Password reset successfully!");
            setForgotStep("success");
        } catch (err: any) {
            setForgotError(err.message);
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSignIn = (data: z.infer<typeof signInZodSchema>) => {
        setError(null);
        setPending(true);
        authClient.signIn.email({ email: data.email.trim().toLowerCase(), password: data.password }, {
            onError: ({ error }) => {
                setPending(false);
                setError(error.message);
            },
            onSuccess: () => {
                setPending(false);
                toast.success("Signed in successfully!");
                router.push("/LibraAI");
            },
        });
    };

    const handleSocial = (provider: 'github' | 'google') => {
        setError(null);
        setPending(true);
        authClient.signIn.social({ provider: provider, callbackURL: "/LibraAI" }, {
            onError: ({ error }) => {
                setPending(false);
                setErrorS(error.message);
            },
            onSuccess: () => {
                setPending(false);
            },
        });
    };

    const handleSignOut = () => authClient.signOut();

    if (session) {
        return (
            <div className="flex items-center justify-center bg-gradient-to-r from-[#e2e2e2] to-[#c9d6ff] font-sans min-h-screen">
                <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
                    <h2 className="text-2xl font-semibold mb-4">Welcome back, {session.user.name}</h2>
                    <Button onClick={handleSignOut}>Sign Out</Button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#e2e2e2] to-[#c9d6ff] font-sans px-4">
                {/* Mobile Layout */}
                <div className="w-full max-w-xl md:hidden">
                    <div className="bg-white rounded-3xl shadow-xl overflow-auto max-h-[90vh]">
                        {/* Top Banner */}
                        <div className="h-56 bg-cover bg-center relative"
                            style={{ backgroundImage: "url('/EdClarity-ai.png')" }}>
                        </div>
                        {/* Form Container */}
                        <div className="p-10">
                            {!isSigningUp ? (
                                <SignInForm
                                    form={signInForm}
                                    pending={pending}
                                    error={error}
                                    onSubmit={handleSignIn}
                                    onSwitch={() => setIsSigningUp(true)}
                                    onForgot={() => { setForgotStep("email"); setIsForgotModalOpen(true); }}
                                    socialDisabled={pending}
                                    isMobile={true}
                                    socialHandlers={{
                                        google: () => authClient.signIn.social({ provider: "google", callbackURL: "/LibraAI" }),
                                        github: () => authClient.signIn.social({ provider: "github", callbackURL: "/LibraAI" }),
                                        microsoft: () => authClient.signIn.social({ provider: "microsoft", callbackURL: "/LibraAI" }),
                                        apple: () => authClient.signIn.social({ provider: "apple", callbackURL: "/LibraAI" })
                                    }}
                                />
                            ) : (
                                <SignUpForm
                                    form={signUpForm}
                                    pending={pending}
                                    error={errorS}
                                    onSubmit={handleSignUp}
                                    onSwitch={() => setIsSigningUp(false)}
                                    socialDisabled={pending}
                                    isMobile={true}
                                    socialHandlers={{
                                        google: () => handleSocial('google'),
                                        github: () => handleSocial('github'),
                                        microsoft: () => authClient.signIn.social({ provider: "microsoft", callbackURL: "/LibraAI" }),
                                        apple: () => authClient.signIn.social({ provider: "apple", callbackURL: "/LibraAI" })
                                    }}
                                />
                            )}
                        </div>
                    </div>
                    <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance mt-4">
                        By continuing, you agree to our <Link href="/terms" className="underline hover:text-primary transition-colors">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-primary transition-colors">Privacy Policy</Link>.
                    </div>
                </div>

                <div className="hidden md:flex flex-col items-center">
                    {/* Desktop Layout */}
                    <div className={clsx("relative w-[900px] min-h-[600px] bg-white rounded-[30px] shadow-xl overflow-hidden transition-all duration-700 hidden md:block", {
                        "active": isSigningUp
                    })}>
                        {/* Sign In Form */}
                        <div className={clsx("absolute top-0 h-full w-1/2 p-12 transition-all duration-700 ease-in-out", {
                            "left-0 opacity-100 z-20": !isSigningUp,
                            "-left-full opacity-0 z-10": isSigningUp,
                        })}>
                            <Form {...signInForm}>
                                <form className="p-6 w-full" onSubmit={signInForm.handleSubmit(handleSignIn)}>
                                    <div className="flex flex-col items-center text-center w-full">
                                        <div className="flex flex-col items-center text-center w-full">
                                            <h2 className="text-2xl font-bold">Welcome Back!</h2>
                                            <h2 className="text-muted-foreground text-balance mb-6">Please login to your account</h2>
                                        </div>
                                        <div className="grid gap-3 w-full">
                                            <FormField
                                                control={signInForm.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="email"
                                                                placeholder="lorem@ipsum.com"
                                                                className="w-full"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={signInForm.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex items-center justify-between">
                                                            <FormLabel>Password</FormLabel>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setForgotStep("email"); setIsForgotModalOpen(true); }}
                                                                className="text-xs text-blue-600 hover:underline font-medium focus:outline-none"
                                                            >
                                                                Forgot password?
                                                            </button>
                                                        </div>
                                                        <FormControl>
                                                            <PasswordInput placeholder="********" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        {!!error && (
                                            <Alert className="bg-destructive/20 border-accent m-2">
                                                <TriangleAlertIcon className="!text-destructive" />
                                                {error}
                                            </Alert>
                                        )}
                                        <Button type="submit" className="w-full px-4 mt-2">Sign In</Button>

                                        {/* Divider */}
                                        <div className="flex items-center my-3 w-full">
                                            <div className="flex-grow h-px bg-muted-foreground/20" />
                                            <span className="mx-4 text-muted-foreground text-xs">Or continue with</span>
                                            <div className="flex-grow h-px bg-muted-foreground/20" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button variant={"outline"} type="button" className="w-full" onClick={() => handleSocial('google')}>
                                                <FcGoogle /> Google
                                            </Button>
                                            <Button variant={"outline"} type="button" className="w-full" onClick={() => { authClient.signIn.social({ provider: "github", callbackURL: "/LibraAI" }) }}>
                                                <FaGithub /> GitHub
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </Form>
                        </div>

                        {/* Sign Up Form */}
                        <div className={clsx("absolute top-0 h-full w-1/2 p-12 transition-all duration-700 ease-in-out", {
                            "left-full w-1/2 opacity-0 z-10": !isSigningUp,
                            "left-0 w-1/2 opacity-100 z-30 translate-x-full": isSigningUp,
                        })}>
                            <Form {...signUpForm}>
                                <form className="p-6 w-full" onSubmit={signUpForm.handleSubmit(handleSignUp)}>
                                    <div className="flex flex-col items-center text-center w-full">
                                        <div className="flex flex-col items-center text-center w-full">
                                            <h2 className="text-2xl font-bold">Create your account</h2>
                                            <h2 className="text-muted-foreground text-balance mb-6">Join us and get started. It&apos;s free!</h2>
                                        </div>
                                        <div className="grid gap-3 w-full">
                                            <FormField
                                                control={signUpForm.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Full Name</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="text"
                                                                placeholder="Your name here.."
                                                                className="w-full"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={signUpForm.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="email"
                                                                placeholder="lorem@ipsum.com"
                                                                className="w-full"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={signUpForm.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Password</FormLabel>
                                                        <FormControl>
                                                            <PasswordInput placeholder="********" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={signUpForm.control}
                                                name="confirmPassword"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Confirm Password</FormLabel>
                                                        <FormControl>
                                                            <PasswordInput placeholder="********" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        {!!errorS && (
                                            <Alert className="bg-destructive/20 border-accent m-2">
                                                <TriangleAlertIcon className="!text-destructive" />
                                                {errorS}
                                            </Alert>
                                        )}
                                        <Button type="submit" disabled={pending} className="w-full px-4 mt-2">
                                            {pending ? "Sending Verification OTP..." : "Sign Up & Authorize Email"}
                                        </Button>

                                        {/* Divider */}
                                        <div className="flex items-center my-3 w-full">
                                            <div className="flex-grow h-px bg-muted-foreground/20" />
                                            <span className="mx-4 text-muted-foreground text-xs">Or continue with</span>
                                            <div className="flex-grow h-px bg-muted-foreground/20" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button variant={"outline"} type="button" className="w-full" onClick={() => handleSocial('google')}>
                                                <FcGoogle /> Google
                                            </Button>
                                            <Button variant={"outline"} type="button" className="w-full" onClick={() => { authClient.signIn.social({ provider: "github", callbackURL: "/LibraAI" }) }}>
                                                <FaGithub /> GitHub
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </Form>
                        </div>

                        {/* Toggle Panel - EXACT COMMITTED UNTOUCHED */}
                        <div className={clsx(
                            "absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-all duration-700 ease-in-out z-30",
                            isSigningUp
                                ? "-translate-x-full rounded-[0_150px_100px_0]"
                                : "translate-x-0 rounded-[150px_0_0_100px]"
                        )}>
                            <div className="bg-cover bg-center text-white flex flex-col justify-end items-center h-full px-10 text-center transition-all duration-700 pb-16"
                                style={{ backgroundImage: "url('/EdClarity-ai.png')" }}>
                                <p className="text-sm mb-4 animate-fade-slide">
                                    {isSigningUp ? "Already have an account? Sign in now." : "Create your EdClarity.ai account in seconds."}
                                </p>
                                <Button
                                    variant="outline"
                                    className="text-white border-white bg-white/20 backdrop-blur-sm hover:bg-white/30 transition animate-slide-up"
                                    style={{ animationDelay: '0.2s' }}
                                    onClick={() => setIsSigningUp(!isSigningUp)}
                                >
                                    {isSigningUp ? "Sign In" : "Sign Up"}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance mt-8">
                        By continuing, you agree to our <Link href="/terms" className="underline hover:text-primary transition-colors">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-primary transition-colors">Privacy Policy</Link>.
                    </div>
                </div>
            </div>

            {/* FORGOT PASSWORD RESEND OTP DIALOG MODAL */}
            <Dialog open={isForgotModalOpen} onOpenChange={setIsForgotModalOpen}>
                <DialogContent showCloseButton={false} className="max-w-sm bg-transparent border-none p-0 shadow-none overflow-hidden rounded-3xl focus:outline-none outline-none border-0 ring-0">
                    {forgotStep === "email" && (
                        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl bg-gray-900 border border-white/10 p-8 py-10 text-white">
                            <div className="absolute inset-0 z-0">
                                <img
                                    src="https://media.giphy.com/media/xJT7pzbviKNqTqF1Ps/giphy.gif"
                                    alt="Tunnel animation"
                                    className="w-full h-full object-cover opacity-60"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/80 via-blue-900/90 to-black/95" />
                            </div>

                            <div className="relative z-10">
                                <div className="text-center mb-6">
                                    <div className="w-10 h-10 mx-auto mb-4 text-purple-300 flex items-center justify-center p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg">
                                        <KeyRound className="w-full h-full" />
                                    </div>
                                    <h1 className="text-2xl font-semibold text-white mb-2 font-sora">Reset Password</h1>
                                    <p className="text-white/70 text-xs leading-relaxed">
                                        Enter your email address to receive a 6-digit verification code.
                                    </p>
                                </div>

                                {forgotError && (
                                    <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-xl text-center text-xs text-red-200">
                                        {forgotError}
                                    </div>
                                )}

                                <form onSubmit={(e) => { e.preventDefault(); handleRequestForgotOtp(); }} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-purple-200 mb-1 block">Email Address</label>
                                        <Input
                                            type="email"
                                            required
                                            placeholder="lorem@ipsum.com"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white placeholder-white/40 focus:bg-white/20 focus:border-white/40 focus:outline-none transition-all duration-200 border shadow-lg rounded-xl h-11 text-xs"
                                        />
                                    </div>
                                    <Button disabled={forgotLoading} type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-2xl transition shadow-xl text-xs flex items-center justify-center gap-2 h-11">
                                        {forgotLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                        Send Reset Code
                                    </Button>
                                </form>

                                <div className="text-center mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotModalOpen(false)}
                                        className="text-white/60 hover:text-white text-xs transition-colors"
                                    >
                                        ← Cancel / Back to Sign In
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {forgotStep === "reset_otp" && (
                        <OTPVerification
                            isModal={true}
                            title="Reset Password"
                            subtitle="We emailed you a password reset code to"
                            email={forgotEmail}
                            length={6}
                            buttonText="Verify Reset Code"
                            isLoading={forgotLoading}
                            error={forgotError}
                            onVerify={(code) => {
                                setForgotOtp(code);
                                setForgotStep("new_password");
                            }}
                            onResend={() => handleRequestForgotOtp(forgotEmail)}
                            onBack={() => setForgotStep("email")}
                        />
                    )}

                    {forgotStep === "new_password" && (
                        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl bg-gray-900 border border-white/10 p-8 py-10 text-white">
                            <div className="absolute inset-0 z-0">
                                <img
                                    src="https://media.giphy.com/media/xJT7pzbviKNqTqF1Ps/giphy.gif"
                                    alt="Tunnel animation"
                                    className="w-full h-full object-cover opacity-60"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/80 via-blue-900/90 to-black/95" />
                            </div>

                            <div className="relative z-10">
                                <div className="text-center mb-6">
                                    <h1 className="text-2xl font-semibold text-white mb-2 font-sora">Create New Password</h1>
                                    <p className="text-white/70 text-xs leading-relaxed">
                                        Enter your new secure password below.
                                    </p>
                                </div>

                                {forgotError && (
                                    <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-xl text-center text-xs text-red-200">
                                        {forgotError}
                                    </div>
                                )}

                                <form onSubmit={handleResetPassword} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-purple-200">New Password</label>
                                        <PasswordInput
                                            placeholder="Minimum 6 characters"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white rounded-xl text-xs h-10"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-purple-200">Confirm New Password</label>
                                        <PasswordInput
                                            placeholder="Re-enter new password"
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white rounded-xl text-xs h-10"
                                        />
                                    </div>
                                    <Button disabled={forgotLoading} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl h-11 text-xs mt-2">
                                        {forgotLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : "Reset Password Now"}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}

                    {forgotStep === "success" && (
                        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl bg-gray-900 border border-white/10 p-8 py-10 text-white text-center">
                            <div className="mx-auto h-12 w-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-4">
                                <CheckCircle2 className="h-7 w-7" />
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 font-sora">Password Reset Successfully!</h4>
                            <p className="text-white/70 text-xs mb-6">You can now sign in with your new password.</p>
                            <Button onClick={() => setIsForgotModalOpen(false)} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs h-11">
                                Sign In Now
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* SIGN-UP EMAIL VERIFICATION OTP DIALOG MODAL */}
            <Dialog open={isSignUpOtpModalOpen} onOpenChange={setIsSignUpOtpModalOpen}>
                <DialogContent showCloseButton={false} className="max-w-sm bg-transparent border-none p-0 shadow-none overflow-hidden rounded-3xl focus:outline-none outline-none border-0 ring-0">
                    <OTPVerification
                        isModal={true}
                        email={signUpPendingData?.email || "user@example.com"}
                        length={6}
                        isLoading={signUpOtpLoading}
                        error={errorS}
                        onVerify={(code) => handleVerifySignUpOtpCode(code)}
                        onResend={() => handleSignUp(signUpForm.getValues())}
                        onBack={() => setIsSignUpOtpModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}