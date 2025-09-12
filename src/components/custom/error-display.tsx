import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { AlertTriangle } from "lucide-react"

interface ErrorDisplayProps {
    title?: string
    description?: string
}

export default function ErrorDisplay({ title, description }: ErrorDisplayProps) {
    const shimmer = (
        <motion.div
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="rounded-md bg-gradient-to-r from-red-200 via-red-300 to-red-200 bg-[length:200%_100%]"
        />
    )

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-rose-50">
            <Card className="w-full max-w-md mx-auto p-10 rounded-2xl shadow-xl border border-red-100 bg-white/90 backdrop-blur">
                <CardContent className="space-y-8">

                    {/* Error Icon */}
                    <div className="flex justify-center text-red-500">
                        <AlertTriangle size={48} strokeWidth={1.5} />
                    </div>

                    {/* Title */}
                    {title ? (
                        <h2 className="text-lg font-semibold text-gray-800 text-center">{title}</h2>
                    ) : (
                        <div className="w-2/3 h-5 mx-auto">{shimmer}</div>
                    )}

                    {/* Description */}
                    {description ? (
                        <p className="text-sm text-gray-600 text-center">{description}</p>
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
