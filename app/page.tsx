"use client"

import { useState } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { Button } from "@/components/ui/button"
import { GraduationCap } from "lucide-react"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Portal</h1>
          <p className="text-gray-600 mt-2">Online Examination System</p>
        </div>

        {isLogin ? <LoginForm /> : <RegisterForm />}

        <div className="text-center">
          <p className="text-sm text-gray-600">{isLogin ? "Don't have an account?" : "Already have an account?"}</p>
          <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="text-blue-600 hover:text-blue-800">
            {isLogin ? "Register here" : "Login here"}
          </Button>
        </div>
      </div>
    </div>
  )
}
