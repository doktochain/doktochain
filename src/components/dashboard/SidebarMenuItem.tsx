import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import LocalizedLink from '../LocalizedLink';
import { MenuItem } from './sidebarMenuConfig';

interface Colors {
  primary: string;
  text: string;
  textSecondary: string;
  border: string;
  sidebarActiveBg: string;
  sidebarActiveBorder: string;
}

interface SidebarMenuItemProps {
  item: MenuItem;
  pathname: string;
  collapsed: boolean;
  open: string | null;
  onToggle: (label: string) => void;
  colors: Colors;
}

export function SidebarSubmenuList({
  item,
  pathname,
  collapsed,
  colors,
}: {
  item: MenuItem;
  pathname: string;
  collapsed: boolean;
  colors: Colors;
}) {
  const { t } = useTranslation('nav');
  if (!item.submenu) return null;
  return (
    <ul
      className={clsx(
        'relative mt-2 space-y-5',
        collapsed
          ? 'absolute left-full top-0 mt-2 bg-white dark:bg-gray-800 p-4 rounded shadow-lg z-50 w-48 max-w-[calc(100vw-5rem)] border border-gray-200 dark:border-gray-700'
          : 'ml-7'
      )}
    >
      {item.submenu.map((sub, index) => {
        const isSubActive = pathname === sub.href;
        const isLast = index === (item.submenu?.length || 0) - 1;

        return (
          <li key={sub.href} className="relative flex items-start gap-3 group">
            <div className="flex flex-col items-center pt-1">
              <span
                className="w-2.5 h-2.5 rounded-full border-2 transition"
                style={{
                  backgroundColor: isSubActive ? colors.primary : 'transparent',
                  borderColor: isSubActive ? colors.primary : colors.border,
                }}
              />
              {!isLast && !collapsed && (
                <span className="flex-1 w-px bg-gray-300 dark:bg-gray-600 mt-1" />
              )}
            </div>
            <LocalizedLink
              to={sub.href}
              className="text-sm font-medium pt-0.5 transition"
              style={{ color: isSubActive ? colors.primary : colors.text }}
              onMouseEnter={(e) => {
                if (!isSubActive) e.currentTarget.style.color = colors.primary;
              }}
              onMouseLeave={(e) => {
                if (!isSubActive) e.currentTarget.style.color = colors.text;
              }}
            >
              {t(sub.label)}
            </LocalizedLink>
          </li>
        );
      })}
    </ul>
  );
}

export default function SidebarMenuItem({
  item,
  pathname,
  collapsed,
  open,
  onToggle,
  colors,
}: SidebarMenuItemProps) {
  const { t } = useTranslation('nav');
  const Icon = item.icon;
  const isActive =
    pathname === item.href || item.submenu?.some((sub) => sub.href === pathname);

  const itemStyle = {
    backgroundColor: isActive ? colors.sidebarActiveBg : 'transparent',
    borderColor: isActive ? colors.sidebarActiveBorder : 'transparent',
  };

  const labelStyle = { color: isActive ? colors.primary : colors.text };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (!isActive) e.currentTarget.style.borderColor = colors.sidebarActiveBorder;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (!isActive) e.currentTarget.style.borderColor = 'transparent';
  };

  const displayLabel = t(item.label);

  return (
    <li key={item.label}>
      {item.submenu ? (
        <div
          className="flex justify-between items-center px-3 py-4 rounded border-2 transition cursor-pointer"
          style={itemStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => onToggle(item.label)}
        >
          <div className="flex items-center gap-3" style={labelStyle} title={collapsed ? displayLabel : undefined}>
            <Icon className="text-xl" />
            {!collapsed && <span>{displayLabel}</span>}
          </div>
          {!collapsed && (
            <ChevronDown
              className={clsx('transition-transform duration-200', open === item.label && 'rotate-180')}
              style={{ color: isActive ? colors.primary : colors.textSecondary }}
            />
          )}
        </div>
      ) : (
        <LocalizedLink
          to={item.href || pathname}
          className="flex justify-between items-center px-3 py-4 rounded border-2 transition cursor-pointer"
          style={itemStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-3" style={labelStyle} title={collapsed ? displayLabel : undefined}>
            <Icon className="text-xl" />
            {!collapsed && <span>{displayLabel}</span>}
          </div>
        </LocalizedLink>
      )}

      {item.submenu && open === item.label && (
        <SidebarSubmenuList
          item={item}
          pathname={pathname}
          collapsed={collapsed}
          colors={colors}
        />
      )}
    </li>
  );
}
