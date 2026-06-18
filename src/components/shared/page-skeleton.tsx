import { cn } from "@/lib/utils"

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      style={style}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col items-center gap-3">
      <Shimmer className="size-20 rounded-full" />
      <div className="space-y-2 text-center">
        <Shimmer className="h-4 w-20 mx-auto" />
        <Shimmer className="h-3 w-16 mx-auto" />
      </div>
    </div>
  )
}

export function StatCardRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
          <Shimmer className="size-8 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
          </div>
          <Shimmer className="h-6 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <Shimmer className="h-5 w-32" />
      <Shimmer className="h-4 w-full" />
      <Shimmer className="h-4 w-2/3" />
    </div>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <div className="h-full w-full rounded-lg bg-muted/50 p-4">
        <div className="flex items-end justify-between h-full gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <Shimmer
                className="w-full rounded-t"
                style={{ height: `${20 + Math.random() * 60}%` }}
              />
              <Shimmer className="h-2 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 pb-2 border-b">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-4 w-16" />
        <Shimmer className="h-4 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-4 w-16" />
          <Shimmer className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

export function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center gap-1">
      <Shimmer className="h-3.5 w-3.5" />
      <Shimmer className="h-3 w-12" />
      <Shimmer className="h-3 w-3" />
      <Shimmer className="h-3 w-16" />
    </div>
  )
}
