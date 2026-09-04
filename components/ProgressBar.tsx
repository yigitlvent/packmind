interface ProgressBarProps {
  packed: number;
  total: number;
}

export function ProgressBar({ packed, total }: ProgressBarProps) {
  const percent = total === 0 ? 0 : Math.round((packed / total) * 100);

  return (
    <div className="space-y-3">
      <p className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">
        {packed} of {total} packed
      </p>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-sand-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`${percent}% packed`}
      >
        <div
          className="h-full rounded-full bg-teal-700 transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
