"use client";

import { useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import clsx from "clsx";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, UseFormReturn, FieldValues } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { TriangleAlertIcon, Github, Apple, LucideIcon } from "lucide-react";
import { FcGoogle } from "react-icons/fc"
import { FaApple, FaMicrosoft, FaGithub, FaLinkedin } from "react-icons/fa"
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const signInZodSchema = z.object({
    email: z.email(),
    password: z.string().min(4, { message: "Kindly enter password correctly! (minimum length 6)" })
})
const signUpZodSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.email(),
    password: z.string().min(6, { message: "Password is mandatory!" }),
    confirmPassword: z.string().min(6, { message: "Password required for confirmation" })
}).refine((data) => data.password === data.confirmPassword, {
    message: "Given passwords do not match.",
    path: ["confirmPassword"]
})

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
    socialDisabled?: boolean;
    socialHandlers?: SocialHandlers;
    isMobile: boolean;
}
export const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(function PasswordInput({className, ...props}, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative w-full">
      <Input
        {...props}
        ref = {ref}
        type={show ? "text" : "password"}
        className={clsx("pr-10", className)}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setShow(!show)}
        onMouseDown={(e) => e.preventDefault()}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});

// Reusable SignInForm component
function SignInForm({ form, pending, error, onSubmit, onSwitch, socialDisabled, socialHandlers, isMobile }: SignFormProps<z.infer<typeof signInZodSchema>>) {
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
                            <FormLabel>Password</FormLabel>
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
                    <Button disabled={socialDisabled} variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={socialHandlers?.google}><FcGoogle /></Button>
                    {/* <Button disabled={socialDisabled} variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={socialHandlers?.microsoft}><FaMicrosoft /></Button> */}
                    <Button disabled={socialDisabled} variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={() => { authClient.signIn.social({ provider: "github", }) }}><FaGithub /></Button>
                    {/* <Button disabled={socialDisabled} variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={socialHandlers?.apple}><FaApple /></Button> */}
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
                <Button disabled={pending} type="submit" className="w-full px-4 mb-4">Sign Up</Button>
                <div className="relative text-center text-sm my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-muted-foreground/30" />
                    </div>
                    <span className="relative z-10 bg-white dark:bg-background px-2 text-muted-foreground">or continue with</span>
                </div>
                <div className={isMobile ? "flex flex-row gap-2 w-full mb-4" : "flex flex-row gap-2 w-full mb-4"}>
                    <Button disabled={socialDisabled} variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={socialHandlers?.google}><FcGoogle /></Button>
                    {/* <Button disabled={socialDisabled} variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={socialHandlers?.microsoft}><FaMicrosoft /></Button> */}
                    <Button disabled={socialDisabled} variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={socialHandlers?.github}><FaGithub /></Button>
                    {/* <Button disabled={socialDisabled} variant="outline" className="flex-1 flex items-center justify-center gap-2 py-2" onClick={socialHandlers?.apple}><FaApple /></Button> */}
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
    })
    const signUpForm = useForm<z.infer<typeof signUpZodSchema>>({
        resolver: zodResolver(signUpZodSchema),
        defaultValues: {
            name: " ",
            email: " ",
            password: "",
            confirmPassword: ""
        }
    });
    const router = useRouter();
    const [error, setError] = useState<string | null>("")
    const [errorS, setErrorS] = useState<string | null>("")
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [pending, setPending] = useState(false);
    const [isSigningUp, setIsSigningUp] = useState(false);

    const { data: session } = authClient.useSession();

    const handleSignUp = (data: z.infer<typeof signUpZodSchema>) => {
        setError(null)
        setPending(true)
        authClient.signUp.email({ name: data.name, email: data.email, password: data.password }, {
            onError: ({ error }) => {
                setPending(false);
                setErrorS(error.message);
            },
            onSuccess: () => {
                setPending(false);
                alert("Signed in successfully");
                setEmail(""); setPassword("");
                router.push("/")
            },

        });
    };

    const handleSignIn = (data: z.infer<typeof signInZodSchema>) => {
        setError(null)
        setPending(true)
        authClient.signIn.email({ email: data.email, password: data.password }, {
            onError: ({ error }) => {
                setPending(false);
                setError(error.message);
            },
            onSuccess: () => {
                setPending(false);
                alert("Signed in successfully");
                setEmail(""); setPassword("");
                router.push("/")
            },

        });
    };
    const handleSocial = (provider: 'github' | 'google') => {
        setError(null)
        setPending(true)
        authClient.signIn.social({ provider: provider , callbackURL: "/" }, {
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
            <div className="flex items-center justify-center bg-gradient-to-r from-[#e2e2e2] to-[#c9d6ff] font-sans">
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
                                    socialDisabled={pending}
                                    isMobile={true}
                                    socialHandlers={{
                                        google: () => authClient.signIn.social({ provider: "google" }),
                                        github: () => authClient.signIn.social({ provider: "github" }),
                                        microsoft: () => authClient.signIn.social({ provider: "microsoft" }),
                                        apple: () => authClient.signIn.social({ provider: "apple" })
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
                                        microsoft: () => authClient.signIn.social({ provider: "microsoft" }),
                                        apple: () => authClient.signIn.social({ provider: "apple" })
                                    }}
                                />
                            )}
                        </div>
                    </div>
                    <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance mt-4">
                        By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
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

                            {/* 
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6"
          /> */}
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
                                                        <FormLabel>Password</FormLabel>
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
                                        <Button type="submit" className="w-full px-4 mt-2" >Sign In</Button>

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
                                            <Button variant={"outline"} type="button" className="w-full" onClick={() => { authClient.signIn.social({ provider: "github", }) }}>
                                                <FaGithub /> GitHub
                                            </Button>
                                            {/* <Button variant={"outline"} type="button" className="w-full">
                                                <FaMicrosoft className="text-cyan-800" />
                                            </Button>
                                            <Button variant={"outline"} type="button" className="w-full">
                                                <FaApple />
                                            </Button>
                                            <Button variant={"outline"} type="button" className="w-full">
                                                <FaLinkedin className="text-blue-600"/>
                                            </Button> */}
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
                                                                type="name"
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
                                        <Button type="submit" className="w-full px-4 mt-2" >Sign Up</Button>

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
                                            <Button variant={"outline"} type="button" className="w-full" onClick={() => { authClient.signIn.social({ provider: "github", }) }}>
                                                <FaGithub /> Github
                                            </Button>
                                            {/* <Button variant={"outline"} type="button" className="w-full" >
                                                <FaMicrosoft />
                                            </Button>
                                            <Button variant={"outline"} type="button" className="w-full">
                                                <FaApple />
                                            </Button> */}
                                        </div>
                                    </div>
                                </form>
                            </Form>
                        </div>

                        {/* Toggle Panel */}
                        <div className={clsx(
                            "absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-all duration-700 ease-in-out z-30",
                            isSigningUp
                                ? "-translate-x-full rounded-[0_150px_100px_0]"
                                : "translate-x-0 rounded-[150px_0_0_100px]"
                        )}>
                            <div className="bg-cover bg-center text-white flex flex-col justify-end items-center h-full px-10 text-center transition-all duration-700 pb-16"
                                style={{ backgroundImage: "url('/EdClarity-ai.png')" }}>
                                {/* <h2 className="text-3xl font-bold mb-2">
              {isSigningUp ? "Welcome Back!" : "New here?"}
            </h2> */}
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
                        By continuing, you agree to our <a href="#"><u>Terms of Service</u></a> and <a href="#"><u>Privacy Policy</u></a>.
                    </div>
                </div>

            </div>

            {/* <div className="flex justify-center mt-6 px-4">
                <p className="text-muted-foreground text-center text-xs text-balance max-w-lg md:max-w-2xl leading-relaxed">
                    By continuing, you agree to our <a href="#" className="underline hover:text-primary">Terms of Service</a> and <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
                </p>
            </div> */}
        </div>
    );
}