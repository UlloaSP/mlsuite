/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft, Home } from "lucide-react"
import { motion } from "motion/react"
import { useNavigate, useRouteError } from "react-router"
import { AppButton, AppCopy, AppPage, AppPanel, AppSectionTitle } from "../components"

export function NotFoundError() {
  const error = useRouteError() as any
  const navigate = useNavigate()

  console.error(error)

  const handleGoHome = () => {
    navigate("/")
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <AppPage className="min-h-dvh items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="flex w-full max-w-2xl"
      >
        <AppPanel className="w-full space-y-6 p-10 text-center md:p-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-2"
          >
            <h1 className="text-8xl font-semibold leading-none text-[var(--text-muted)] md:text-[10rem]">404</h1>
          </motion.div>

          <div className="mx-auto grid size-24 place-items-center rounded-full border border-[var(--accent-quiet)] bg-[var(--surface-secondary)] text-[var(--accent-primary)]">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.002-5.824-2.582M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>

          <AppSectionTitle className="text-4xl md:text-5xl">Oops! Page not found</AppSectionTitle>
          <AppCopy className="mx-auto max-w-md text-base">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. We&apos;ll get you back to something useful.
          </AppCopy>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mx-auto max-w-md rounded-[20px] border border-[color:var(--danger-quiet)] bg-[var(--danger-quiet)] p-4"
            >
              <p className="font-mono text-sm text-[var(--danger-text)]">
                {error.statusText || error.message || "Page Not Found"}
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row"
          >
            <AppButton onClick={handleGoHome}>
              <Home className="h-5 w-5" />
              Go Home
            </AppButton>

            <AppButton onClick={handleGoBack} variant="secondary">
              <ArrowLeft className="h-5 w-5" />
              Go Back
            </AppButton>
          </motion.div>
        </AppPanel>
      </motion.div>
    </AppPage>
  )
}

