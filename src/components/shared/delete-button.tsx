"use client"

import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface Props {
  action: () => Promise<void>
  label?: string
}

export function DeleteButton({ action, label = "Delete" }: Props) {
  return (
    <form action={async () => {
      if (confirm(`Are you sure you want to ${label.toLowerCase()} this?`)) {
        await action()
        toast.success(`${label} deleted`)
      }
    }}>
      <Button type="submit" variant="destructive" size="sm">
        <Trash2 size={14} />
        {label}
      </Button>
    </form>
  )
}