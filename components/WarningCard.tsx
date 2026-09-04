interface WarningCardProps {
  title: string;
  message: string;
}

export function WarningCard({ title, message }: WarningCardProps) {
  return (
    <article className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 4.86 1.82 19a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 4.86a2 2 0 0 0-3.42 0Z"
            />
          </svg>
        </span>
        <div>
          <h3 className="font-serif text-xl text-ink">{title}</h3>
          <p className="mt-1 text-[15px] leading-6 text-ink-soft">{message}</p>
        </div>
      </div>
    </article>
  );
}
