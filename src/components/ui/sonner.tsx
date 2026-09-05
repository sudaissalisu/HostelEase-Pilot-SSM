"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"
import * as React from "react"

const Toaster = ({ ...props }: ToasterProps) => {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const { theme = "system" } = useTheme()

  // Don't render during SSR/SSG to prevent useContext errors
  if (!mounted) return null

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
