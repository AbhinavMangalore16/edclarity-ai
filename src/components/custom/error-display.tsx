import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { AlertTriangle } from "lucide-react"

interface ErrorDisplayProps {
  title?: string
  description?: string
}

export default function ErrorDisplay({ title, description }: ErrorDisplayProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      <Card className="w-full max-w-md mx-auto p-10 rounded-2xl shadow-xl border border-red-100 bg-white/80 backdrop-blur">
        <CardContent className="space-y-6">
          
          {/* Animated Alert Icon */}
          <div className="flex justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            >
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </motion.div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-medium text-red-700 text-center">
            {title || "Something went wrong"}
          </h2>

          {/* Description */}
          <p className="text-sm text-gray-600 text-center">
            {description || "Please try again or check your connection."}
          </p>

        </CardContent>
      </Card>
    </div>
  )
}
