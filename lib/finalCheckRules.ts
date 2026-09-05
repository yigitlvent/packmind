import type { PackingItem, FinalCheckWarning } from "@/types/packing";
import type { Trip } from "@/types/trip";
import { tripWeatherProfile } from "@/lib/weatherProfile";

export interface FinalCheckContext {
  trip: Trip;
  items: PackingItem[];
}

type Rule = {
  id: string;
  evaluate: (ctx: FinalCheckContext) => FinalCheckWarning | null;
};

function findItem(items: PackingItem[], name: string) {
  return items.find((item) => item.name === name);
}

function isPacked(items: PackingItem[], name: string) {
  return findItem(items, name)?.is_packed === true;
}

export const finalCheckRules: Rule[] = [
  {
    id: "laptop-charger",
    evaluate: ({ items }) => {
      if (isPacked(items, "Laptop") && !isPacked(items, "Laptop charger")) {
        return {
          id: "laptop-charger",
          title: "Laptop charger",
          message: "You packed your laptop, but not its charger.",
        };
      }
      return null;
    },
  },
  {
    id: "laptop-missing",
    evaluate: ({ trip, items }) => {
      if (trip.taking_laptop && !isPacked(items, "Laptop")) {
        return {
          id: "laptop-missing",
          title: "Laptop",
          message:
            "You said you're taking your laptop, but it isn't marked as packed.",
        };
      }
      return null;
    },
  },
  {
    id: "gym-shoes",
    evaluate: ({ trip, items }) => {
      if (trip.gym && !isPacked(items, "Gym shoes")) {
        return {
          id: "gym-shoes",
          title: "Gym shoes",
          message:
            "You're planning to work out, but no athletic shoes are packed.",
        };
      }
      return null;
    },
  },
  {
    id: "gym-clothes",
    evaluate: ({ trip, items }) => {
      if (trip.gym && !isPacked(items, "Gym clothes")) {
        return {
          id: "gym-clothes",
          title: "Gym clothes",
          message:
            "You planned gym time, but workout clothes aren't packed yet.",
        };
      }
      return null;
    },
  },
  {
    id: "rain-protection",
    evaluate: ({ trip, items }) => {
      if (
        tripWeatherProfile(trip) === "rainy" &&
        !isPacked(items, "Rain jacket") &&
        !isPacked(items, "Umbrella")
      ) {
        return {
          id: "rain-protection",
          title: "Rain protection",
          message:
            "Rain is expected, but you haven't packed rain protection.",
        };
      }
      return null;
    },
  },
  {
    id: "swimsuit",
    evaluate: ({ trip, items }) => {
      if (trip.swimming && !isPacked(items, "Swimsuit")) {
        return {
          id: "swimsuit",
          title: "Swimsuit",
          message: "You're planning to swim, but your swimsuit isn't packed.",
        };
      }
      return null;
    },
  },
  {
    id: "formal-outfit",
    evaluate: ({ trip, items }) => {
      if (trip.formal_event && !isPacked(items, "Formal outfit")) {
        return {
          id: "formal-outfit",
          title: "Formal outfit",
          message:
            "You selected a formal event, but your formal outfit isn't packed.",
        };
      }
      return null;
    },
  },
  {
    id: "dress-shoes",
    evaluate: ({ trip, items }) => {
      if (trip.formal_event && !isPacked(items, "Dress shoes")) {
        return {
          id: "dress-shoes",
          title: "Dress shoes",
          message:
            "You have a formal event on the trip, but dress shoes aren't packed.",
        };
      }
      return null;
    },
  },
  {
    id: "hiking-shoes",
    evaluate: ({ trip, items }) => {
      if (trip.hiking && !isPacked(items, "Hiking shoes")) {
        return {
          id: "hiking-shoes",
          title: "Hiking shoes",
          message: "You planned a hike, but hiking shoes aren't packed.",
        };
      }
      return null;
    },
  },
  {
    id: "cold-jacket",
    evaluate: ({ trip, items }) => {
      if (tripWeatherProfile(trip) === "cold" && !isPacked(items, "Jacket")) {
        return {
          id: "cold-jacket",
          title: "Jacket",
          message: "Cold weather is expected, but a jacket isn't packed.",
        };
      }
      return null;
    },
  },
  {
    id: "hot-sunscreen",
    evaluate: ({ trip, items }) => {
      if (tripWeatherProfile(trip) === "hot" && !isPacked(items, "Sunscreen")) {
        return {
          id: "hot-sunscreen",
          title: "Sunscreen",
          message: "Hot weather is expected, but sunscreen isn't packed.",
        };
      }
      return null;
    },
  },
  {
    id: "phone-charger",
    evaluate: ({ items }) => {
      if (isPacked(items, "Phone") && !isPacked(items, "Phone charger")) {
        return {
          id: "phone-charger",
          title: "Phone charger",
          message: "You packed your phone, but not its charger.",
        };
      }
      return null;
    },
  },
];

export function runFinalCheck(ctx: FinalCheckContext): FinalCheckWarning[] {
  return finalCheckRules
    .map((rule) => rule.evaluate(ctx))
    .filter((warning): warning is FinalCheckWarning => warning !== null);
}

export function getUnpackedItems(items: PackingItem[]): PackingItem[] {
  return items.filter((item) => !item.is_packed);
}

export function areAllItemsPacked(items: PackingItem[]) {
  return items.length > 0 && items.every((item) => item.is_packed);
}
