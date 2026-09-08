export type PriceModel = "fixed" | "starting_at" | "quote";
export type Service = {
  _id: string;
  name: string;
  category: string;
  description: string;
  priceModel: PriceModel;
  basePrice: number;
  durationMinutes: number;
  isActive: boolean;
};
export type BookingStatus =
  | "requested"
  | "confirmed"
  | "assigned"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";
export type Technician = {
  _id: string;
  name: string;
  email: string;
  role: "technician";
};
export type Booking = {
  _id: string;
  bookingNumber: string;
  serviceId: string;
  serviceNameSnapshot: string;
  basePriceSnapshot: number;
  durationMinutesSnapshot: number;
  technicianId?: Technician | string | null;
  status: BookingStatus;
  preferredStart?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  address: string;
  customerNotes: string;
  technicianNotes: string;
  createdAt: string;
};
