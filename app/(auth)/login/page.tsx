"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate login for now
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 backdrop-blur-md mb-4 shadow-lg ring-1 ring-white/10">
            <Activity className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">SalesTools</h1>
          <p className="text-slate-400 mt-2">Mobile Agent Portal</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">
                Akun
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 h-12"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/25 transition-all"
              disabled={loading}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" /> Sign In
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Salesman Tools &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
