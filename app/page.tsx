"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RecentTrips } from "@/components/RecentTrips";
import { useAuth } from "@/components/AuthProvider";

export default function HomePage() {
  const router = useRouter();
  const { account, configured, continueAsGuest } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/trip/new");
  }, [router]);

  async function handlePlanMyTrip() {
    setError(null);
    setPending(true);
    try {
      await continueAsGuest();
      router.push("/trip/new");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not start a guest session.",
      );
      setPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-20 sm:px-8">
      <section className="grid items-center gap-12 pt-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-10">
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-teal-800 uppercase">
            PackMind
          </p>
          <h1 className="mt-4 max-w-xl font-serif text-4xl leading-[1.12] tracking-tight text-ink sm:text-6xl">
            Never realize what
            <br />
            you forgot after it&apos;s
            <br />
            too late.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-ink-soft">
            Tell us a little about your trip. PackMind will build a
            personalized packing list and help catch the things you&apos;re
            most likely to forget before you leave.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void handlePlanMyTrip()}
              disabled={pending}
              className="btn-primary w-full sm:w-auto"
            >
              {pending ? "Opening..." : "Plan My Trip"}
            </button>
            <a href="#how-it-works" className="btn-secondary w-full sm:w-auto">
              How Final Check works
            </a>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <aside className="rounded-[2rem] border border-sand-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
            Before you go...
          </p>
          <p className="mt-3 font-serif text-2xl text-ink">
            3 things worth checking before you leave.
          </p>
          <ul className="mt-5 space-y-3">
            <PreviewWarning
              title="Laptop charger"
              message="You packed your laptop, but not its charger."
            />
            <PreviewWarning
              title="Gym shoes"
              message="You’re planning to work out, but no athletic shoes are packed."
            />
            <PreviewWarning
              title="Rain protection"
              message="You selected rainy weather, but haven’t packed rain protection."
            />
          </ul>
        </aside>
      </section>

      <section id="how-it-works" className="mt-20 grid gap-4 sm:grid-cols-3">
        <Step
          number="01"
          title="Describe the trip"
          body="Destination, dates, and what you’ll actually do."
        />
        <Step
          number="02"
          title="Pack with a list"
          body="A list shaped by your context — not a generic dump of everything."
        />
        <Step
          number="03"
          title="Catch the gaps"
          body="Final Check notices when the packing state doesn’t make sense."
        />
      </section>

      {!configured || account ? <RecentTrips /> : null}
    </main>
  );
}

function PreviewWarning({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <li className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-ink-soft">{message}</p>
    </li>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-sand-200 bg-sand-50 p-5">
      <p className="text-xs tracking-[0.16em] text-teal-800">{number}</p>
      <h2 className="mt-3 font-serif text-xl text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
    </div>
  );
}
