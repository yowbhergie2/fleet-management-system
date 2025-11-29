import { create } from 'zustand';
import type { TripTicket } from '@/types';

interface TripState {
  trips: TripTicket[];
  selectedTrip: TripTicket | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTrips: (trips: TripTicket[]) => void;
  addTrip: (trip: TripTicket) => void;
  updateTrip: (id: string, updates: Partial<TripTicket>) => void;
  deleteTrip: (id: string) => void;
  selectTrip: (trip: TripTicket | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  selectedTrip: null,
  isLoading: false,
  error: null,
  
  setTrips: (trips) => set({ trips }),
  
  addTrip: (trip) => set((state) => ({
    trips: [trip, ...state.trips],
  })),
  
  updateTrip: (id, updates) => set((state) => ({
    trips: state.trips.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    ),
    selectedTrip: state.selectedTrip?.id === id
      ? { ...state.selectedTrip, ...updates }
      : state.selectedTrip,
  })),
  
  deleteTrip: (id) => set((state) => ({
    trips: state.trips.filter((t) => t.id !== id),
    selectedTrip: state.selectedTrip?.id === id ? null : state.selectedTrip,
  })),
  
  selectTrip: (trip) => set({ selectedTrip: trip }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
}));