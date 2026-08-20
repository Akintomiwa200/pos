function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[#e8e8ee] ${className}`} />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <Bone className={`rounded-md ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div>
        <Bone className="h-3 w-20 rounded-full" />
        <Bone className="mt-3 h-8 w-48 rounded-xl" />
        <Bone className="mt-3 h-4 w-full max-w-xl rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Bone key={index} className="h-[118px] rounded-[20px]" />
        ))}
      </div>
      <Bone className="h-12 rounded-full" />
      <div className="grid gap-3 xl:grid-cols-2">
        <Bone className="min-h-[320px] rounded-[28px]" />
        <Bone className="min-h-[320px] rounded-[28px]" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="relative space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="flex items-center gap-2">
        <Bone className="h-10 w-10 rounded-full" />
        <Bone className="h-10 w-28 rounded-full" />
        <Bone className="h-10 w-28 rounded-full" />
        <Bone className="h-8 w-8 rounded-full" />
        <div className="ml-auto flex gap-2">
          <Bone className="h-9 w-9 rounded-full" />
          <Bone className="h-9 w-9 rounded-full" />
          <Bone className="h-9 w-9 rounded-full" />
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Bone className="h-10 w-48 rounded-xl" />
        <Bone className="h-9 w-44 rounded-full" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
        <div className="min-w-0 shrink-0 lg:max-w-[340px]">
          <Bone className="h-3 w-16 rounded-full" />
          <Bone className="mt-3 h-10 w-56 rounded-xl" />
          <Bone className="mt-3 h-4 w-40 rounded-lg" />
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Bone className="min-h-[118px] rounded-[20px]" />
          <Bone className="min-h-[118px] rounded-[20px]" />
          <Bone className="col-span-2 min-h-[118px] rounded-[20px] sm:col-span-1" />
        </div>
      </div>
      <Bone className="h-12 rounded-full" />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Bone className="min-h-[292px] rounded-[28px]" />
          <Bone className="min-h-[292px] rounded-[28px]" />
          <Bone className="min-h-[280px] rounded-[28px] sm:col-span-2" />
        </div>
        <Bone className="min-h-[520px] rounded-[28px]" />
      </div>
    </div>
  );
}

export function ManagerSkeleton({ variant = "table" }: { variant?: "table" | "groups" }) {
  if (variant === "groups") {
    return (
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading</span>
        <div className="rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
          <Bone className="mb-2 h-9 w-full rounded-lg" />
          {Array.from({ length: 5 }, (_, index) => (
            <Bone key={index} className="mb-1 h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
          <Bone className="h-4 w-24 rounded-md" />
          <Bone className="mt-2 h-10 w-full max-w-md rounded-xl" />
          <Bone className="mt-6 h-4 w-28 rounded-md" />
          <div className="mt-3 flex flex-wrap gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Bone key={index} className="h-8 w-28 rounded-full" />
            ))}
          </div>
          <Bone className="mt-6 h-4 w-24 rounded-md" />
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Bone key={index} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
        <div className="border-b border-neutral-100 px-4 py-3">
          <Bone className="h-4 w-full rounded-md" />
        </div>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="border-b border-neutral-50 px-4 py-3">
            <Bone className="h-4 w-full rounded-md" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
        <Bone className="h-5 w-32 rounded-md" />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="mt-4">
            <Bone className="h-3 w-20 rounded-md" />
            <Bone className="mt-2 h-10 w-full rounded-xl" />
          </div>
        ))}
        <Bone className="mt-6 h-10 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export function NoticeSkeleton() {
  return (
    <div className="space-y-3 px-3 py-3" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex gap-3">
          <Bone className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-4 w-3/4 rounded-md" />
            <Bone className="h-3 w-full rounded-md" />
            <Bone className="h-3 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConsoleChromeSkeleton() {
  return (
    <div className="flex h-svh overflow-hidden bg-[#f3f4f8]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <aside className="hidden h-full w-72 shrink-0 border-r border-neutral-200 bg-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2 px-5 py-5">
          <Bone className="h-8 w-8 rounded-full" />
          <Bone className="h-4 w-28 rounded-md" />
        </div>
        <div className="space-y-6 px-3 pb-4">
          {Array.from({ length: 4 }, (_, section) => (
            <div key={section}>
              <Bone className="mb-3 ml-3 h-3 w-16 rounded-full" />
              <div className="space-y-1">
                {Array.from({ length: 4 }, (_, row) => (
                  <Bone key={row} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 w-full shrink-0 items-center gap-3 bg-[#f3f4f8] px-4 sm:px-6 lg:h-[10vh] lg:px-8">
          <Bone className="h-10 min-w-0 flex-1 rounded-xl" />
          <Bone className="h-10 w-10 shrink-0 rounded-xl" />
          <Bone className="h-10 w-10 shrink-0 rounded-full" />
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-8">
            <PageSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}
