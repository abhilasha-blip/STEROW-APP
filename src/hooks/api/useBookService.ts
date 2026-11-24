import { useMutation, useQuery } from '@tanstack/react-query';
import {
  bookingService,
  type Address,
  type BookingRequest,
  type BookingResult,
  type ServiceCentre,
  type ServiceItem,
  type TimeSlot,
} from '@/services/bookingService';
import { queryKeys } from './queryKeys';

/**
 * Book a Service data. All of it is the UI-only mock behind bookingService today; when the API lands
 * only the service changes. (The user's vehicles are real: useMyVehicles.)
 */
export function useBookingServices() {
  return useQuery<ServiceItem[]>({ queryKey: queryKeys.bookingServices(), queryFn: bookingService.listServices });
}

export function useServiceCentres() {
  return useQuery<ServiceCentre[]>({ queryKey: queryKeys.serviceCentres(), queryFn: bookingService.listCentres });
}

export function useTimeSlots() {
  return useQuery<TimeSlot[]>({ queryKey: queryKeys.timeSlots(), queryFn: bookingService.listTimeSlots });
}

export function useSavedAddresses() {
  return useQuery<Address[]>({ queryKey: queryKeys.savedAddresses(), queryFn: bookingService.listSavedAddresses });
}

export function useCreateBooking() {
  return useMutation<BookingResult, Error, BookingRequest>({ mutationFn: bookingService.createBooking });
}
