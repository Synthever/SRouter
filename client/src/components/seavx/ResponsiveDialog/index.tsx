import type { ReactNode } from "react"

import { BottomSheet } from "@/components/arc/bottom-sheet/bottom-sheet"
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog"

import useIsMobile from "./hooks/useIsMobile"

type ResponsiveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Desktop panel width. The sheet is full-bleed and ignores it. */
  className?: string
  /** Sheet resting heights, smallest first. Ignored on desktop. */
  detents?: number[]
  /** Sheet body padding. The desktop panel carries its own. */
  sheetClassName?: string
  children: ReactNode
}

/**
 * One body, two shells: below `md` the body rises as Arc's bottom sheet, from
 * `md` up it sits in the centred dialog. Both shells are Radix dialog roots,
 * so a `DialogClose` inside `children` closes either one and no caller needs to
 * know which shell it got.
 */
export default function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  className,
  detents = [0.55, 0.92],
  sheetClassName = "p-4",
  children,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        detents={detents}
        initialDetent={0}
      >
        <div className={sheetClassName}>{children}</div>
      </BottomSheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        description={description}
        className={className}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}
