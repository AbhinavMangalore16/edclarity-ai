import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { HashLoader } from "react-spinners"

interface LoadingDisplayProps {
    title?: string
    description?: string
}

export default function LoadingDisplay({ title, description }: LoadingDisplayProps) {
    const shimmer = (
        <motion.div
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="rounded-md bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]"
        />
    )

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
            <Card className="w-full max-w-md mx-auto p-10 rounded-2xl shadow-xl border border-gray-100 bg-white/80 backdrop-blur">
                <CardContent className="space-y-8">

                    {/* Spinner */}
                    <div className="flex justify-center">
                        <HashLoader size={40} color="#7c3aed" />
                    </div>

                    {/* Title */}
                    {title ? (
                        <h2 className="text-lg font-medium text-gray-800 text-center">{title}</h2>
                    ) : (
                        <div className="w-2/3 h-5 mx-auto">{shimmer}</div>
                    )}

                    {/* Description */}
                    {description ? (
                        <p className="text-sm text-gray-500 text-center">{description}</p>
                    ) : (
                        <div className="space-y-2">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="h-4">{shimmer}</div>
                            ))}
                        </div>
                    )}


                </CardContent>
            </Card>
        </div>
    )
}
