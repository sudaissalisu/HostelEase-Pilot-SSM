"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 max-h-screen overflow-y-auto",
          // ── Mobile: ALWAYS bottom sheet (regardless of `side` prop) ──
          // Slides up from the bottom with a curved top edge — standard
          // mobile UX pattern. Overrides the side-based positioning.
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom bottom-0 left-0 right-0 top-auto h-auto max-h-[90vh] rounded-t-2xl border-t pb-8",
          // ── Desktop: use the original `side` positioning ──
          side === "right" &&
            "sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-3/4 sm:max-w-sm sm:border-l sm:border-t-0 sm:rounded-none sm:data-[state=open]:slide-in-from-right sm:data-[state=closed]:slide-out-to-right",
          side === "left" &&
            "sm:inset-y-0 sm:left-0 sm:right-auto sm:h-full sm:w-3/4 sm:max-w-sm sm:border-r sm:border-t-0 sm:rounded-none sm:data-[state=open]:slide-in-from-left sm:data-[state=closed]:slide-out-to-left",
          side === "top" &&
            "sm:inset-x-0 sm:top-0 sm:bottom-auto sm:h-auto sm:border-b sm:border-t-0 sm:rounded-none sm:data-[state=open]:slide-in-from-top sm:data-[state=closed]:slide-out-to-top",
          side === "bottom" &&
            "sm:inset-x-0 sm:bottom-0 sm:top-auto sm:h-auto sm:border-t sm:rounded-none sm:data-[state=open]:slide-in-from-bottom sm:data-[state=closed]:slide-out-to-bottom",
          className
        )}
        {...props}
      >
        {/* Drag handle indicator — mobile only */}
        <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-muted-foreground/30 shrink-0" />
        {children}
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none z-10">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "flex flex-col gap-2 p-4",
        // Sticky at the bottom of the sheet so action buttons are always
        // visible — the user doesn't have to scroll down to find them.
        "sticky bottom-0 bg-background/95 backdrop-blur-sm border-t mt-auto",
        className
      )}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
