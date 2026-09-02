import { apiClient } from "../../api/client";
import type { Booking, BookingStatus, Service, Technician } from "./types";

type Envelope<T> = { success: true; data: T };
export async function getServices() {
  return (await apiClient.get<Envelope<{ services: Service[] }>>("/services"))
    .data.data.services;
}
export async function createService(input: Omit<Service, "_id" | "isActive">) {
  return (
    await apiClient.post<Envelope<{ service: Service }>>("/services", input)
  ).data.data.service;
}
export async function updateService(
  id: string,
  input: Partial<Omit<Service, "_id">>,
) {
  return (
    await apiClient.patch<Envelope<{ service: Service }>>(
      `/services/${id}`,
      input,
    )
  ).data.data.service;
}
export async function createBooking(input: {
  serviceId: string;
  preferredStart?: string;
  address: string;
  customerNotes: string;
}) {
  return (
    await apiClient.post<Envelope<{ booking: Booking }>>("/bookings", input)
  ).data.data.booking;
}
export async function getBookings() {
  return (await apiClient.get<Envelope<{ bookings: Booking[] }>>("/bookings"))
    .data.data.bookings;
}
export async function getTechnicians() {
  return (
    await apiClient.get<Envelope<{ technicians: Technician[] }>>(
      "/users/technicians",
    )
  ).data.data.technicians;
}
export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  technicianNotes?: string,
) {
  return (
    await apiClient.patch<Envelope<{ booking: Booking }>>(
      `/bookings/${id}/status`,
      {
        status,
        ...(technicianNotes === undefined ? {} : { technicianNotes }),
      },
    )
  ).data.data.booking;
}
export async function assignBooking(id: string, technicianId: string) {
  return (
    await apiClient.patch<Envelope<{ booking: Booking }>>(
      `/bookings/${id}/assignment`,
      { technicianId },
    )
  ).data.data.booking;
}
export async function scheduleBooking(id: string, scheduledStart: string) {
  return (
    await apiClient.patch<Envelope<{ booking: Booking }>>(
      `/bookings/${id}/schedule`,
      { scheduledStart },
    )
  ).data.data.booking;
}
export async function cancelBooking(id: string) {
  return (
    await apiClient.post<Envelope<{ booking: Booking }>>(
      `/bookings/${id}/cancel`,
    )
  ).data.data.booking;
}
