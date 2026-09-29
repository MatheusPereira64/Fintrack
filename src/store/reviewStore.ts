import { create } from 'zustand';
import { PendingReview, UnrecognizedNotification } from '../models/types';
import { PendingReviewRepository } from '../database/repositories/PendingReviewRepository';
import { UnrecognizedNotificationRepository } from '../database/repositories/UnrecognizedNotificationRepository';

interface ReviewState {
  pendingReviews: PendingReview[];
  unrecognized: UnrecognizedNotification[];
  pendingCount: number;
  unrecognizedCount: number;
  isLoading: boolean;

  refreshCounts: () => Promise<void>;
  loadPendingReviews: () => Promise<void>;
  loadUnrecognized: () => Promise<void>;
}

export const useReviewStore = create<ReviewState>((set) => ({
  pendingReviews: [],
  unrecognized: [],
  pendingCount: 0,
  unrecognizedCount: 0,
  isLoading: false,

  refreshCounts: async () => {
    try {
      const [pendingCount, unrecognizedCount] = await Promise.all([
        PendingReviewRepository.countPending(),
        UnrecognizedNotificationRepository.countOpen(),
      ]);
      set({ pendingCount, unrecognizedCount });
    } catch {
      // ignore
    }
  },

  loadPendingReviews: async () => {
    set({ isLoading: true });
    try {
      const pendingReviews = await PendingReviewRepository.findPending();
      const pendingCount = pendingReviews.length;
      set({ pendingReviews, pendingCount, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadUnrecognized: async () => {
    set({ isLoading: true });
    try {
      const unrecognized = await UnrecognizedNotificationRepository.findOpen();
      const unrecognizedCount = unrecognized.length;
      set({ unrecognized, unrecognizedCount, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
