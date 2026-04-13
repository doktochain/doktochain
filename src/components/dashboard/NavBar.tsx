import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import NotificationBell from '../notifications/NotificationBell';
import LocalizedLink from '../LocalizedLink';
import { LanguageToggle } from '../ui/LanguageToggle';

import { CalendarDays, Search, Settings, LogOut, HelpCircle, Undo2, Sun, Moon, Bell, NotebookPen, Menu } from 'lucide-react';

type NavBarProps = {
  onToggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
};

const NavBar = ({ onToggleSidebar }: NavBarProps) => {
  const { user, userProfile, hasRole, signOut } = useAuth();
  const { theme, darkMode, toggleDarkMode, role } = useTheme();
  const { t } = useTranslation('nav');
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<null | 'notifications' | 'profile'>(null);
  const [mobileMenuOpen, setLocalMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isProvider = userProfile?.role === 'provider' || hasRole('provider');
  const isAdmin = userProfile?.role === 'admin' || hasRole('admin');
  const isPharmacy = userProfile?.role === 'pharmacy' || hasRole('pharmacy');
  const isClinic = userProfile?.role === 'clinic';

  const userName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : user?.email?.split('@')[0] || 'User';

  const roleKeyMap: Record<string, string> = {
    patient: 'navbar.rolePatient',
    provider: 'navbar.roleProvider',
    admin: 'navbar.roleAdmin',
    pharmacy: 'navbar.rolePharmacy',
    clinic: 'navbar.roleClinic',
    staff: 'navbar.roleStaff',
  };
  const userRole = roleKeyMap[role] ? t(roleKeyMap[role]) : role.charAt(0).toUpperCase() + role.slice(1);

  const getAppointmentsRoute = () => {
    if (isProvider) return '/dashboard/provider/appointments';
    if (isAdmin) return '/dashboard/admin/clinic/appointments';
    if (isClinic) return '/dashboard/clinic/schedule';
    if (isPharmacy) return '/dashboard/pharmacy/orders';
    return '/dashboard/patient/appointments';
  };

  const getProfileRoute = () => {
    if (isProvider) return '/dashboard/provider/profile';
    if (isAdmin) return '/dashboard/admin/settings/account';
    if (isClinic) return '/dashboard/clinic/profile';
    if (isPharmacy) return '/dashboard/pharmacy/profile';
    return '/dashboard/patient/profile';
  };

  const getSettingsRoute = () => {
    if (isProvider) return '/dashboard/provider/profile';
    if (isAdmin) return '/dashboard/admin/settings/system';
    if (isClinic) return '/dashboard/clinic/settings';
    if (isPharmacy) return '/dashboard/pharmacy/profile';
    return '/dashboard/patient/settings';
  };

  const getNotificationsRoute = () => {
    if (isProvider) return '/dashboard/provider/notifications-preferences';
    if (isClinic) return '/dashboard/clinic/notifications';
    if (isPharmacy) return '/dashboard/pharmacy/notifications';
    return '/dashboard/notifications';
  };

  const getHelpRoute = () => {
    if (isProvider) return '/dashboard/provider/help-center';
    if (isAdmin) return '/dashboard/admin/reports';
    return '/dashboard/help';
  };

  const toggleDropdown = (type: 'notifications' | 'profile') => {
    setOpenDropdown(prev => (prev === type ? null : type));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const dropdowns = document.querySelectorAll('.dropdown-panel');
      const isClickInside = Array.from(dropdowns).some(dropdown =>
        dropdown.contains(e.target as Node)
      );

      const buttons = document.querySelectorAll('.dropdown-button');
      const isClickOnButton = Array.from(buttons).some(button =>
        button.contains(e.target as Node)
      );

      if (!isClickInside && !isClickOnButton) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      const langMatch = location.pathname.match(/^\/(en|fr)/);
      const lang = langMatch ? langMatch[1] : 'en';
      navigate(`/${lang}`);
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  };

  return (
    <div className="main-wrapper relative">
      <div
        className="header flex items-center justify-between px-4 py-4 shadow text-white z-10"
        style={{ backgroundColor: darkMode ? 'rgb(17, 24, 39)' : theme.colors.light.navbarBg }}
      >
        <div className="flex items-center gap-4">
          <LocalizedLink to="/dashboard" className="logo flex items-center gap-2">
            <img src="/image/doktochain_logo.png" alt="Logo" className="w-[120px] md:w-[170px] h-auto" />
          </LocalizedLink>

          <button
            className="hidden lg:block p-2 rounded-full border border-white transition"
            style={{
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.light.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onClick={onToggleSidebar}
          >
            <Undo2 size={20} />
          </button>
        </div>

        <div className="top-nav-search w-1/4 hidden md:block">
          <form className="flex items-center border rounded px-2 bg-white dark:bg-gray-800 dark:border-gray-700">
            <input
              type="text"
              className="form-control w-full py-1 px-2 bg-transparent text-black dark:text-white outline-none"
              placeholder={t('navbar.search')}
            />
            <button type="submit">
              <Search className="text-gray-400" />
            </button>
          </form>
        </div>

        <ul className="nav user-menu hidden lg:flex items-center gap-4 text-white">
          <li className="text-sm font-medium text-white px-3 py-2 bg-white/20 rounded-lg border border-white/30">
            <span className="font-semibold">{theme.name}</span>
          </li>
          <li>
            <button
              className="border border-white font-semibold text-white px-4 py-2 rounded-full text-sm transition"
              style={{
                background: `linear-gradient(to right, ${theme.colors.light.primary}, ${theme.colors.light.secondary})`,
              }}
            >
              {t('navbar.aiAssistance')}
            </button>
          </li>

          <li>
            <LanguageToggle variant="dark" />
          </li>

          <li className="p-2 rounded-full border border-white cursor-pointer transition"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.light.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}>
            <LocalizedLink to={getAppointmentsRoute()}>
              <CalendarDays size={20} />
            </LocalizedLink>
          </li>

          <li className="p-2 rounded-full border border-white cursor-pointer transition"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.light.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}>
            <LocalizedLink to={getSettingsRoute()}>
              <Settings size={20} />
            </LocalizedLink>
          </li>

          <li
            className="p-2 rounded-full border border-white cursor-pointer transition"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.light.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onClick={toggleDarkMode}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </li>

          <li className="relative">
            <NotificationBell />
          </li>

          <li className="relative">
            <button
              className="flex items-center gap-2 cursor-pointer dropdown-button"
              onClick={() => toggleDropdown('profile')}
            >
              {userProfile?.profile_photo_url ? (
                <img
                  src={userProfile.profile_photo_url}
                  width={35}
                  height={35}
                  alt="User"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
             {openDropdown === 'profile' && (
               <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border rounded shadow-lg z-50 dropdown-panel">
                 <div className="flex items-center gap-4 p-4 border-b">
                   {userProfile?.profile_photo_url ? (
                     <img
                       src={userProfile.profile_photo_url}
                       width={40}
                       height={40}
                       alt="User"
                       className="rounded-full object-cover w-10 h-10"
                     />
                   ) : (
                     <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                       {userName.charAt(0).toUpperCase()}
                     </div>
                   )}
                   <div>
                     <div className="font-semibold text-gray-800 dark:text-white">{userName}</div>
                     <div className="text-xs" style={{ color: theme.colors.light.primary }}>{userRole}</div>
                   </div>
                 </div>

                 <div className="p-2 text-sm text-gray-800 dark:text-gray-200">
                   <LocalizedLink
                     to={getProfileRoute()}
                     className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                     onClick={() => setOpenDropdown(null)}
                   >
                     <Settings /> {t('navbar.myProfile')}
                   </LocalizedLink>

                   <LocalizedLink
                     to={getSettingsRoute()}
                     className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                     onClick={() => setOpenDropdown(null)}
                   >
                     <Settings /> {t('navbar.settings')}
                   </LocalizedLink>

                   <LocalizedLink
                     to={getNotificationsRoute()}
                     className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                     onClick={() => setOpenDropdown(null)}
                   >
                     <div className="flex items-center gap-2">
                       <Bell />
                       <span>{t('navbar.notifications')}</span>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.preventDefault()}>
                       <input
                         type="checkbox"
                         className="sr-only peer"
                         checked={notificationsEnabled}
                         onChange={(e) => {
                           e.stopPropagation();
                           setNotificationsEnabled(!notificationsEnabled);
                         }}
                       />
                       <div className="w-8 h-4 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition duration-300"></div>
                       <div className="absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transform peer-checked:translate-x-4 transition-transform duration-300"></div>
                     </label>
                   </LocalizedLink>

                   <button
                     onClick={() => {
                       setOpenDropdown(null);
                       toast.info('Activity Logs feature coming soon!');
                     }}
                     className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors w-full text-left"
                   >
                     <NotebookPen /> {t('navbar.activityLogs')}
                   </button>

                   <LocalizedLink
                     to={getHelpRoute()}
                     onClick={() => setOpenDropdown(null)}
                     className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors w-full text-left"
                   >
                     <HelpCircle /> {t('navbar.helpAndSupport')}
                   </LocalizedLink>
                 </div>

                 <button
                   onClick={handleLogout}
                   disabled={loggingOut}
                   className="flex items-center gap-2 border-t px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-800 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed rounded-b transition-colors"
                 >
                   <LogOut />
                   <span>{loggingOut ? t('navbar.loggingOut') : t('navbar.logOut')}</span>
                 </button>
               </div>
             )}
          </li>
        </ul>

        <div className="flex lg:hidden justify-end w-full">
          <button
            type="button"
            onClick={() => setLocalMobileMenuOpen(true)}
            className="inline-flex items-center justify-center rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-white transition-all duration-200"
            style={{
              backgroundColor: theme.colors.light.primaryDark,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.light.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.light.primaryDark;
            }}
          >
            <span className="sr-only">Open Nav menu</span>
            <Menu aria-hidden="true" className="h-8 w-8 text-gray-50" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="absolute top-[calc(100%+1rem)] left-0 right-0 p-4 z-50 transition-all duration-300"
          style={{ backgroundColor: theme.colors.light.primary }}
        >
          <div className="mb-3">
            <LanguageToggle variant="dark" />
          </div>
          <LocalizedLink to={getProfileRoute()} className="block py-2 text-white" onClick={() => setLocalMobileMenuOpen(false)}>{t('navbar.myProfile')}</LocalizedLink>
          <LocalizedLink to={getSettingsRoute()} className="block py-2 text-white" onClick={() => setLocalMobileMenuOpen(false)}>{t('navbar.settings')}</LocalizedLink>
          <LocalizedLink to={getNotificationsRoute()} className="block py-2 text-white" onClick={() => setLocalMobileMenuOpen(false)}>{t('navbar.notifications')}</LocalizedLink>
        </div>
      )}
    </div>
  );
};

export default NavBar;
