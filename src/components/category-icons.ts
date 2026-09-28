import {
  AudioLines,
  Building2,
  CalendarCheck2,
  Camera,
  Flower2,
  Gift,
  Guitar,
  Mic2,
  Shapes,
  ShieldCheck,
  Truck,
  Utensils,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';

export const categoryIconsBySlug: Record<string, LucideIcon> = {
  'event-planning-management': CalendarCheck2,
  'venues-accommodation': Building2,
  'sound-lighting-stage': AudioLines,
  'decoration-florists': Flower2,
  'catering-food': Utensils,
  'photography-media': Camera,
  'makeup-fashion-styling': WandSparkles,
  'artists-entertainment': Mic2,
  'invitations-printing-gifts': Gift,
  'transportation-logistics': Truck,
  'event-support-services': ShieldCheck,
  'bands': Guitar,
};

export function categoryIconFor(slug: string): LucideIcon {
  return categoryIconsBySlug[slug] ?? Shapes;
}
