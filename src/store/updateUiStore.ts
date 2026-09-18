import { create } from 'zustand';

export type UpdateDialogVariant =
  | 'update'
  | 'success'
  | 'info'
  | 'error'
  | 'permission'
  | 'progress';

export type UpdateDialogAction = 'primary' | 'secondary' | 'github' | 'dismiss';

export interface UpdateDialogPayload {
  variant: UpdateDialogVariant;
  title: string;
  message: string;
  primaryLabel?: string | null;
  secondaryLabel?: string | null;
  showGithub?: boolean;
  githubUrl?: string | null;
  localVersion?: string | null;
  remoteVersion?: string | null;
  dismissible?: boolean;
}

interface UpdateUiState extends UpdateDialogPayload {
  visible: boolean;
  progress: number | null;
  waiter: ((action: UpdateDialogAction) => void) | null;

  present: (payload: UpdateDialogPayload) => Promise<UpdateDialogAction>;
  setProgress: (pct: number | null) => void;
  close: () => void;
  respond: (action: UpdateDialogAction) => void;
}

const empty: UpdateDialogPayload = {
  variant: 'info',
  title: '',
  message: '',
  primaryLabel: 'OK',
  secondaryLabel: null,
  showGithub: false,
  githubUrl: null,
  localVersion: null,
  remoteVersion: null,
  dismissible: true,
};

export const useUpdateUiStore = create<UpdateUiState>((set, get) => ({
  ...empty,
  visible: false,
  progress: null,
  waiter: null,

  present: payload => {
    return new Promise(resolve => {
      get().waiter?.('dismiss');
      set({
        ...empty,
        ...payload,
        visible: true,
        progress: payload.variant === 'progress' ? 0 : null,
        waiter: resolve,
        dismissible: payload.dismissible ?? payload.variant !== 'progress',
      });
    });
  },

  setProgress: pct => set({ progress: pct }),

  close: () => {
    get().waiter?.('dismiss');
    set({ visible: false, waiter: null, progress: null });
  },

  respond: action => {
    const { waiter } = get();
    set({ visible: false, waiter: null, progress: null });
    waiter?.(action);
  },
}));
