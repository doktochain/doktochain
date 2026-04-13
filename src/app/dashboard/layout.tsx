import React, { ReactNode, useState } from 'react';
import NavBar from '../../components/dashboard/NavBar';
import Sidebar from '../../components/dashboard/Sidebar';
import { ThemeProvider } from '../../contexts/ThemeContext';

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <NavBar
         onToggleSidebar={toggleSidebar}
         setMobileMenuOpen={setMobileMenuOpen} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            collapsed={sidebarCollapsed}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
