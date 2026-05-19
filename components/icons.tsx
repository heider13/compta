// Icones essentielles pour la landing B2B Next.js (SVG inline, légères)
// Pour les composants legacy/client SPA, voir public/components/icons.jsx

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

const wrap = (children: React.ReactNode, props: IconProps) => (
  <svg
    width={props.size ?? 16}
    height={props.size ?? 16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    style={props.style}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const Arrow = (p: IconProps) => wrap(<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>, p);
export const Check = (p: IconProps) => wrap(<polyline points="20 6 9 17 4 12" />, p);
export const Plus = (p: IconProps) => wrap(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, p);
export const Shield = (p: IconProps) => wrap(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, p);
export const Bolt = (p: IconProps) => wrap(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />, p);
export const Doc = (p: IconProps) => wrap(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>, p);
export const DocPlus = (p: IconProps) => wrap(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="13" x2="12" y2="19" /><line x1="9" y1="16" x2="15" y2="16" /></>, p);
export const Building = (p: IconProps) => wrap(<><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" /><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01" /></>, p);
export const Lock = (p: IconProps) => wrap(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, p);
export const Sparkle = (p: IconProps) => wrap(<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />, p);
export const Chart = (p: IconProps) => wrap(<><line x1="3" y1="20" x2="21" y2="20" /><polyline points="6 16 10 12 14 14 19 8" /></>, p);
export const Users = (p: IconProps) => wrap(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>, p);
export const Link = (p: IconProps) => wrap(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>, p);
export const Workflow = (p: IconProps) => wrap(<><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M9 6h6a3 3 0 0 1 3 3v6" /></>, p);
