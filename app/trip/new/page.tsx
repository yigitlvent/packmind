import { RecentTrips } from "@/components/RecentTrips";
import { TripForm } from "@/components/TripForm";

export default function NewTripPage() {
  return (
    <div className="min-h-full">
      <main className="mx-auto w-full max-w-xl px-5 pb-20 sm:px-8">
        <p className="text-sm font-medium tracking-[0.18em] text-teal-800 uppercase">
          Plan a trip
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-ink">
          Tell us about the trip.
        </h1>
        <p className="mt-3 text-base leading-7 text-ink-soft">
          PackMind builds a list from your context, then watches for the
          mistakes that usually show up at the airport.
        </p>
        <div className="mt-8 rounded-[2rem] border border-sand-200 bg-white p-5 shadow-sm sm:p-8">
          <TripForm />
        </div>
        <RecentTrips />
      </main>
    </div>
  );
}
