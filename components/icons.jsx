/* eslint-disable */
// Iconography — minimal stroke icons, original

const Icon = ({ children, size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...rest}>{children}</svg>
);

const I = {
  Check:    (p) => <Icon {...p}><path d="M4 12.5l5 5L20 6.5"/></Icon>,
  Arrow:    (p) => <Icon {...p}><path d="M5 12h14M13 5l7 7-7 7"/></Icon>,
  ArrowDR:  (p) => <Icon {...p}><path d="M7 17L17 7M9 7h8v8"/></Icon>,
  Bolt:     (p) => <Icon {...p}><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/></Icon>,
  Shield:   (p) => <Icon {...p}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></Icon>,
  Doc:      (p) => <Icon {...p}><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h7M9 17h5"/></Icon>,
  DocPlus:  (p) => <Icon {...p}><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M12 12v6M9 15h6"/></Icon>,
  DocEdit:  (p) => <Icon {...p}><path d="M6 3h7l4 4v6"/><path d="M6 3v18h12v-3"/><path d="M14 16l5-5 3 3-5 5h-3z"/></Icon>,
  DocX:     (p) => <Icon {...p}><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M10 13l4 4M14 13l-4 4"/></Icon>,
  Clock:    (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>,
  Link:     (p) => <Icon {...p}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7L11 7"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7L13 17"/></Icon>,
  Stack:    (p) => <Icon {...p}><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/></Icon>,
  Chart:    (p) => <Icon {...p}><path d="M3 21h18"/><path d="M7 17V10M12 17V6M17 17v-9"/></Icon>,
  ChevDown: (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>,
  ChevRight:(p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>,
  Plus:     (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  Minus:    (p) => <Icon {...p}><path d="M5 12h14"/></Icon>,
  Search:   (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></Icon>,
  Send:     (p) => <Icon {...p}><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></Icon>,
  Sparkle:  (p) => <Icon {...p}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></Icon>,
  User:     (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></Icon>,
  Building: (p) => <Icon {...p}><path d="M3 21h18"/><path d="M5 21V5h10v16"/><path d="M15 21V11h4v10"/><path d="M8 9h4M8 13h4M8 17h4"/></Icon>,
  Lock:     (p) => <Icon {...p}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></Icon>,
  EUR:      (p) => <Icon {...p}><path d="M17 5a8 8 0 100 14"/><path d="M4 10h10M4 14h10"/></Icon>,
  Bell:     (p) => <Icon {...p}><path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 21a2 2 0 004 0"/></Icon>,
  Mail:     (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></Icon>,
  Phone:    (p) => <Icon {...p}><path d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></Icon>,
  Pin:      (p) => <Icon {...p}><path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></Icon>,
  Grid:     (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Icon>,
  Star:     (p) => <Icon {...p}><path d="M12 3l2.7 6 6.3.6-4.7 4.3 1.4 6.1L12 17l-5.7 3 1.4-6.1L3 9.6 9.3 9z"/></Icon>,
};

window.I = I;
window.Icon = Icon;
