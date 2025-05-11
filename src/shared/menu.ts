export type SharedMenuItem =
  | { label: string; action: 'show-hud' | 'manage' | 'quit'; separator?: false }
  | { separator: true };

export const sharedMenu: SharedMenuItem[] = [
  { label: 'Show HUD', action: 'show-hud' },
  { label: 'Options', action: 'manage' },
  { separator: true },
  { label: 'Quit', action: 'quit' },
]; 