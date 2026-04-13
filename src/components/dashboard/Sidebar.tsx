import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { adminStaffPermissionsService } from '../../services/adminStaffPermissionsService';
import clsx from 'clsx';
import {
  patientMenu,
  providerMenu,
  pharmacyMenu,
  clinicMenu,
  adminMenu,
  type MenuItem,
  type MenuSection,
} from './sidebarMenuConfig';
import SidebarMenuItem from './SidebarMenuItem';

export default function Sidebar({
  collapsed,
  mobileMenuOpen,
  setMobileMenuOpen,
}: {
  collapsed: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}) {
  const { hasRole, userProfile, user, loading } = useAuth();
  const { currentColors } = useTheme();
  const { t } = useTranslation('nav');
  const [open, setOpen] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewablePaths, setViewablePaths] = useState<Set<string> | null>(null);
  const location = useLocation();
  const rawPathname = location.pathname.replace(/^\/(en|fr)/, '') || '/';

  const userRole = userProfile?.role;
  const isAdmin = userRole === 'admin' || hasRole('admin');
  const isStaff = (userRole as string) === 'staff';
  const isClinic = userRole === 'clinic';
  const isAdminMenu = isAdmin || isStaff;

  useEffect(() => {
    if (isStaff && user?.id) {
      adminStaffPermissionsService.getUserViewablePaths(user.id).then(setViewablePaths);
    }
  }, [isStaff, user?.id]);

  const getBaseMenu = () => {
    if (isAdmin || isStaff) return adminMenu;
    if (isClinic) return clinicMenu;
    if (userRole === 'provider' || hasRole('provider')) return providerMenu;
    if (userRole === 'pharmacy' || hasRole('pharmacy')) return pharmacyMenu;
    return patientMenu;
  };

  const menu = useMemo(() => {
    const base = getBaseMenu();
    if (!isStaff || !viewablePaths) return base;

    return (base as MenuSection[]).map(section => {
      const filteredItems = section.items.filter(item => {
        if (item.href && viewablePaths.has(item.href)) return true;
        if (item.submenu) {
          return item.submenu.some(sub => viewablePaths.has(sub.href));
        }
        return false;
      }).map(item => {
        if (!item.submenu) return item;
        return { ...item, submenu: item.submenu.filter(sub => viewablePaths.has(sub.href)) };
      });
      return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);
  }, [isStaff, viewablePaths, userRole]);

  useEffect(() => {
    if (isAdminMenu) {
      const allItems = (menu as MenuSection[]).flatMap(s => s.items);
      const currentItem = allItems.find(item => item.submenu?.some(sub => sub.href === rawPathname));
      if (currentItem) setOpen(currentItem.label);
    } else {
      const currentItem = (menu as MenuItem[]).find(item => item.submenu?.some(sub => sub.href === rawPathname));
      if (currentItem) setOpen(currentItem.label);
    }
  }, [rawPathname, menu, isAdminMenu]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) setOpen(null);
  }, [isMobile]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const toggleSubmenu = (label: string) => {
    setOpen((prev) => (prev === label ? null : label));
  };

  const colors = {
    primary: currentColors.primary,
    text: currentColors.text,
    textSecondary: currentColors.textSecondary,
    border: currentColors.border,
    sidebarActiveBg: currentColors.sidebarActiveBg,
    sidebarActiveBorder: currentColors.sidebarActiveBorder,
  };

  if (loading) {
    return (
      <aside
        className={clsx(
          'sidebar h-full shadow transition-all duration-300 z-50 flex flex-col overflow-hidden',
          collapsed ? 'w-20' : 'w-64',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
        style={{ backgroundColor: currentColors.sidebarBg }}
      >
        <div className="px-3 py-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: currentColors.primary }} />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('navbar.loadingMenu')}</p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={clsx(
        'sidebar h-full shadow transition-all duration-300 z-50 flex flex-col overflow-hidden',
        collapsed ? 'w-20' : 'w-64',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
      )}
      style={{ backgroundColor: currentColors.sidebarBg }}
    >
      <div className="lg:hidden flex justify-end p-2 flex-shrink-0">
        <button
          className="text-gray-800 dark:text-white p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
          onClick={() => setMobileMenuOpen(false)}
        >
          ✕
        </button>
      </div>

      <div className="px-3 py-6 overflow-y-auto flex-1">
        {isAdminMenu ? (
          <div className="space-y-6">
            {(menu as MenuSection[]).map((section) => (
              <div key={section.section}>
                {!collapsed && (
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-3">
                    {t(section.section)}
                  </h3>
                )}
                <ul className="space-y-3 text-sm font-bold">
                  {section.items.map((item) => (
                    <SidebarMenuItem
                      key={item.label}
                      item={item}
                      pathname={rawPathname}
                      collapsed={collapsed}
                      open={open}
                      onToggle={toggleSubmenu}
                      colors={colors}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-3 text-sm font-bold">
            {(menu as MenuItem[]).map((item) => (
              <SidebarMenuItem
                key={item.label}
                item={item}
                pathname={rawPathname}
                collapsed={collapsed}
                open={open}
                onToggle={toggleSubmenu}
                colors={colors}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
