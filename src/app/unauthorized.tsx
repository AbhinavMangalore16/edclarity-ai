"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Unauthorized() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
            <Card className="w-full max-w-2xl mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center space-y-4 pb-8">
                    <div className="mx-auto w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                        {/* Lottie Animation Space */}
                        <div className="text-center">
                            <div className="text-6xl mb-4">🔒</div>
                            <p className="text-sm text-gray-500">
                                Lottie animation will be placed here
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                                Replace this div with your Lottie component
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <CardTitle className="text-4xl font-bold text-gray-900">
                            401
                        </CardTitle>
                        <CardDescription className="text-xl text-gray-600">
                            Access Denied
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="text-center space-y-6">
                    <p className="text-gray-500 text-lg leading-relaxed">
                        You don&apos;t have permission to access this resource. 
                        Please sign in with the appropriate credentials to continue.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button 
                            onClick={() => router.back()}
                            variant="outline" 
                            className="flex items-center gap-2 px-6 py-3"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go Back
                        </Button>
                        
                        <Link href="/login">
                            <Button className="flex items-center gap-2 px-6 py-3">
                                <LogIn className="w-4 h-4" />
                                Sign In
                            </Button>
                        </Link>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                            <Shield className="w-4 h-4" />
                            <span>Secure access required</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
