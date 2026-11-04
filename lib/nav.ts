// lib/nav.ts — Navigation config (single source of truth for all nav items)
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Grid3X3,
  BarChart2,
  BookOpen,
  Settings,
  Timer,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  showInBottomBar: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, showInBottomBar: false },
  { href: '/today',     label: 'Today',     icon: CheckSquare,     showInBottomBar: true  },
  { href: '/calendar',  label: 'Calendar',  icon: Calendar,        showInBottomBar: false },
  { href: '/grid',      label: 'Grid',      icon: Grid3X3,         showInBottomBar: true  },
  { href: '/focus',     label: 'Focus',     icon: Timer,           showInBottomBar: true  },
  { href: '/insights',  label: 'Insights',  icon: BarChart2,       showInBottomBar: true  },
  { href: '/review',    label: 'Review',    icon: BookOpen,        showInBottomBar: false },
  { href: '/settings',  label: 'Settings',  icon: Settings,        showInBottomBar: true  },
]

export const BOTTOM_BAR_ITEMS = NAV_ITEMS.filter((i) => i.showInBottomBar)
