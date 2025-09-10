import { ArrowRight, Chrome, Github, Lock } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useUser } from "../../user/hooks";

export function Unauthorized() {
    const BACKEND = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";
    const base = BACKEND || "";
    const [redirecting, setRedirecting] = useState<null | "google" | "github">(null);
    const { data: _, isLoading } = useUser();

    const login = (provider: "google" | "github") => {
        setRedirecting(provider);
        window.location.href = `${base}/oauth2/authorization/${provider}`;
    };

    return (
        <motion.div className="flex flex-1 size-full min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-rose-50 to-rose-100 dark:from-gray-900 dark:via-slate-800 dark:to-rose-900">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-2xl overflow-hidden m-6 md:m-12 p-10 md:p-12 bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-white/10 flex flex-col items-center justify-center text-center"
            >
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                    className="text-center mb-8 flex flex-col"
                    role="region"
                    aria-labelledby="unauth-title"
                >
                    <motion.div
                        initial={{ scale: 0.8, rotate: -10, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2, type: "spring", stiffness: 200 }}
                        className="mx-auto mb-8 relative"
                    >
                        <div className="size-28 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 grid place-items-center relative overflow-hidden">
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                                aria-hidden
                            >
                                <Lock className="size-12 text-slate-900 dark:text-white" />
                            </motion.div>
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                animate={{ x: [-100, 100] }}
                                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", repeatDelay: 2 }}
                                aria-hidden
                            />
                        </div>
                    </motion.div>

                    <motion.h1
                        id="unauth-title"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-3"
                    >
                        Access Required
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                        className="text-balance leading-relaxed text-slate-600 dark:text-slate-400 max-w-prose mx-auto"
                    >
                        Please authenticate with your corporate account to continue
                    </motion.p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.5 }}
                    className="space-y-3"
                >
                    {/* Primary (Google) */}
                    <button
                        type="button"
                        onClick={() => login("google")}
                        aria-label="Sign in with Google"
                        disabled={!!redirecting || isLoading}
                        className="
      w-full group relative overflow-hidden inline-flex items-center justify-center gap-2
      rounded-md
      border border-slate-300 bg-white text-slate-900
      px-5 py-3 text-sm font-medium shadow-sm transition-all
      hover:bg-slate-50 hover:shadow-md
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
      disabled:opacity-60 disabled:pointer-events-none
      dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100
      dark:hover:bg-slate-700 dark:focus-visible:ring-primary/50
    "
                    >
                        <Chrome aria-hidden className="mr-1.5 size-5 relative z-10" />
                        <span className="relative z-10">
                            {redirecting === "google" || isLoading ? "Signing…" : "Continue with Google"}
                        </span>
                        <ArrowRight
                            aria-hidden
                            className="ml-2 size-4 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-1"
                        />
                    </button>

                    {/* Neutral (GitHub) */}
                    <button
                        type="button"
                        onClick={() => login("github")}
                        aria-label="Sign in with GitHub"
                        disabled={!!redirecting || isLoading}
                        className="
      w-full group relative overflow-hidden inline-flex items-center justify-center gap-2
      rounded-md
      border border-slate-300 bg-white text-slate-900
      px-5 py-3 text-sm font-medium shadow-sm transition-all
      hover:bg-slate-50 hover:shadow-md
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
      disabled:opacity-60 disabled:pointer-events-none
      dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100
      dark:hover:bg-slate-700 dark:focus-visible:ring-primary/50
    "
                    >
                        <Github aria-hidden className="mr-1.5 size-5 relative z-10" />
                        <span className="relative z-10">
                            {redirecting === "github" || isLoading ? "Signing…" : "Continue with GitHub"}
                        </span>
                        <ArrowRight
                            aria-hidden
                            className="ml-2 size-4 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-1"
                        />
                    </button>
                </motion.div>


                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.4 }}
                    className="mt-6 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-500"
                >
                    By continuing, you agree to our{" "}
                    <a href="#/legal/terms" className="text-primary underline-offset-4 hover:underline">Terms of Service</a>{" "}
                    and{" "}
                    <a href="#/legal/privacy" className="text-primary underline-offset-4 hover:underline">Privacy Policy</a>.
                </motion.p>

                <motion.div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-full"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "60%", opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                    aria-hidden
                />
            </motion.div>
        </motion.div>
    );
}
