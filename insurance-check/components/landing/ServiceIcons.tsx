import { HandCoins, Hospital, SearchCheck } from "lucide-react";
import type { ServiceType } from "@/lib/types";

export const SERVICE_ICON: Record<ServiceType, typeof Hospital> = {
  unclaimed: Hospital,
  hidden: SearchCheck,
  refund: HandCoins,
};
