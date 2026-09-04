import type { CreateTripInput } from "@/types/trip";
import type { GeneratedPackingItem } from "@/types/packing";

function addUnique(
  items: Map<string, GeneratedPackingItem>,
  item: GeneratedPackingItem,
) {
  if (!items.has(item.name)) {
    items.set(item.name, item);
  }
}

export function generatePackingList(
  trip: CreateTripInput,
): GeneratedPackingItem[] {
  const items = new Map<string, GeneratedPackingItem>();
  const days = Math.max(1, Math.round(trip.duration));
  const shirts = Math.max(1, Math.ceil(days * 0.7));
  const pants = Math.max(1, Math.ceil(days / 3));

  addUnique(items, {
    name: "ID / Passport",
    category: "Essentials",
    importance: "essential",
    reason: "You'll need identification at every stage of travel.",
  });
  addUnique(items, {
    name: "Wallet",
    category: "Essentials",
    importance: "essential",
    reason: null,
  });
  addUnique(items, {
    name: "Phone",
    category: "Electronics",
    importance: "essential",
    reason: null,
  });
  addUnique(items, {
    name: "Phone charger",
    category: "Electronics",
    importance: "essential",
    reason: "A charged phone is only useful if you can keep it that way.",
  });
  addUnique(items, {
    name: `Underwear (${days})`,
    category: "Clothing",
    importance: "essential",
    reason: `Packed for a ${days}-day trip.`,
  });
  addUnique(items, {
    name: `Socks (${days})`,
    category: "Clothing",
    importance: "essential",
    reason: `Packed for a ${days}-day trip.`,
  });
  addUnique(items, {
    name: `Shirts (${shirts})`,
    category: "Clothing",
    importance: "essential",
    reason: "About 70% of trip days, rounded up.",
  });
  addUnique(items, {
    name: `Pants (${pants})`,
    category: "Clothing",
    importance: "essential",
    reason: null,
  });
  addUnique(items, {
    name: "Toiletries",
    category: "Essentials",
    importance: "essential",
    reason: null,
  });

  if (trip.taking_laptop) {
    addUnique(items, {
      name: "Laptop",
      category: "Electronics",
      importance: "essential",
      reason: "You said you're taking your laptop.",
    });
    addUnique(items, {
      name: "Laptop charger",
      category: "Electronics",
      importance: "essential",
      reason: "Recommended because you're taking your laptop.",
    });
  }

  if (trip.trip_type === "business") {
    addUnique(items, {
      name: "Business clothes",
      category: "Clothing",
      importance: "recommended",
      reason: "This is a business trip.",
    });
    addUnique(items, {
      name: "Work essentials",
      category: "Essentials",
      importance: "recommended",
      reason: "Notes, adapters, or anything you need to work on the road.",
    });
  }

  if (trip.trip_type === "vacation") {
    addUnique(items, {
      name: "Casual clothes",
      category: "Clothing",
      importance: "recommended",
      reason: "Comfortable clothes for a vacation pace.",
    });
  }

  if (trip.gym) {
    addUnique(items, {
      name: "Gym clothes",
      category: "Activities",
      importance: "recommended",
      reason: "You planned time at the gym.",
    });
    addUnique(items, {
      name: "Gym shoes",
      category: "Activities",
      importance: "recommended",
      reason: "You'll need athletic shoes if you're working out.",
    });
  }

  if (trip.swimming) {
    addUnique(items, {
      name: "Swimsuit",
      category: "Activities",
      importance: "recommended",
      reason: "You planned to swim.",
    });
    addUnique(items, {
      name: "Flip-flops",
      category: "Activities",
      importance: "optional",
      reason: "Useful around the pool or beach.",
    });
  }

  if (trip.hiking) {
    addUnique(items, {
      name: "Hiking shoes",
      category: "Activities",
      importance: "recommended",
      reason: "You planned a hike.",
    });
    addUnique(items, {
      name: "Water bottle",
      category: "Activities",
      importance: "recommended",
      reason: "Stay hydrated on the trail.",
    });
  }

  if (trip.formal_event) {
    addUnique(items, {
      name: "Formal outfit",
      category: "Activities",
      importance: "recommended",
      reason: "You selected a formal event.",
    });
    addUnique(items, {
      name: "Dress shoes",
      category: "Activities",
      importance: "recommended",
      reason: "To go with your formal outfit.",
    });
  }

  if (trip.weather === "rainy") {
    addUnique(items, {
      name: "Rain jacket",
      category: "Weather",
      importance: "recommended",
      reason: "Rain is expected on this trip.",
    });
    addUnique(items, {
      name: "Umbrella",
      category: "Weather",
      importance: "recommended",
      reason: "Backup rain protection.",
    });
  }

  if (trip.weather === "cold") {
    addUnique(items, {
      name: "Jacket",
      category: "Weather",
      importance: "recommended",
      reason: "Cold weather is expected.",
    });
    addUnique(items, {
      name: "Warm layers",
      category: "Weather",
      importance: "recommended",
      reason: "Easy to add or remove as temperatures change.",
    });
  }

  if (trip.weather === "hot") {
    addUnique(items, {
      name: "Sunglasses",
      category: "Weather",
      importance: "recommended",
      reason: "Hot, bright conditions are expected.",
    });
    addUnique(items, {
      name: "Sunscreen",
      category: "Weather",
      importance: "recommended",
      reason: "Sun protection is easy to forget until you're already outside.",
    });
  }

  if (trip.weather === "mixed") {
    addUnique(items, {
      name: "Light jacket",
      category: "Weather",
      importance: "recommended",
      reason: "Conditions look mixed, so a versatile layer helps.",
    });
  }

  return Array.from(items.values());
}
