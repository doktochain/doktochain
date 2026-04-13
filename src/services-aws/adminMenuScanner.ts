export interface MenuResource {
  id: string;
  label: string;
  path: string;
  section: string;
  parentMenu: string | null;
  hasSubmenu: boolean;
  icon?: string;
}

interface AdminMenuItem {
  label: string;
  href?: string;
  submenu?: { label: string; href: string }[];
}

interface AdminMenuSection {
  section: string;
  items: AdminMenuItem[];
}

const adminMenuStructure: AdminMenuSection[] = [
  {
    section: 'Main Menu',
    items: [
      {
        label: 'DASHBOARD',
        submenu: [
          { label: 'Analytics', href: '/dashboard/admin/dashboard/analytics' },
          { label: 'Finance', href: '/dashboard/admin/dashboard/finance' },
          { label: 'Sales', href: '/dashboard/admin/dashboard/sales' },
        ],
      },
      {
        label: 'APPLICATIONS',
        submenu: [
          { label: 'Chat', href: '/dashboard/chat' },
          { label: 'Calls', href: '/dashboard/calls' },
          { label: 'Calendar', href: '/dashboard/calendar' },
          { label: 'Contacts', href: '/dashboard/contacts' },
          { label: 'Email', href: '/dashboard/email' },
          { label: 'Invoices', href: '/dashboard/invoices' },
          { label: 'Notes', href: '/dashboard/notes' },
          { label: 'Kanban Board', href: '/dashboard/kanban' },
          { label: 'File Manager', href: '/dashboard/file-manager' },
          { label: 'Social Feed', href: '/dashboard/social-feed' },
          { label: 'Search Results', href: '/dashboard/search-results' },
        ],
      },
    ],
  },
  {
    section: 'General',
    items: [
      {
        label: 'USER MANAGEMENT',
        href: '/dashboard/admin/users',
      },
      {
        label: 'SYSTEM ACTIVITY',
        href: '/dashboard/admin/activity',
      },
    ],
  },
  {
    section: 'Clinic Management',
    items: [
      {
        label: 'PROVIDERS',
        submenu: [
          { label: 'Manage Providers', href: '/dashboard/admin/clinic/providers' },
          { label: 'Provider Applications', href: '/dashboard/admin/provider-applications' },
        ],
      },
      {
        label: 'PATIENTS',
        href: '/dashboard/admin/clinic/patients',
      },
      {
        label: 'PHARMACIES',
        submenu: [
          { label: 'Manage Pharmacies', href: '/dashboard/admin/clinic/pharmacies' },
          { label: 'Pending Approval', href: '/dashboard/admin/pharmacies' },
        ],
      },
      {
        label: 'APPOINTMENTS',
        href: '/dashboard/admin/clinic/appointments',
      },
      {
        label: 'LOCATIONS',
        href: '/dashboard/admin/clinic/locations',
      },
      {
        label: 'SERVICES',
        href: '/dashboard/admin/clinic/services',
      },
      {
        label: 'SPECIALIZATIONS',
        href: '/dashboard/admin/clinic/specializations',
      },
      {
        label: 'INSURANCE PROVIDERS',
        href: '/dashboard/admin/clinic/insurance-providers',
      },
      {
        label: 'ASSETS',
        href: '/dashboard/admin/clinic/assets',
      },
      {
        label: 'PROCEDURES',
        href: '/dashboard/admin/clinic/procedures',
      },
      {
        label: 'PRODUCTS',
        href: '/dashboard/admin/clinic/products',
      },
      {
        label: 'CUSTOM MANAGEMENT',
        href: '/dashboard/admin/clinic/custom-management',
      },
    ],
  },
  {
    section: 'HRM',
    items: [
      {
        label: 'HRM DASHBOARD',
        href: '/dashboard/admin/hrm/dashboard',
      },
      {
        label: 'STAFF MANAGEMENT',
        href: '/dashboard/admin/staff',
      },
      {
        label: 'DEPARTMENTS',
        href: '/dashboard/admin/hrm/departments',
      },
      {
        label: 'ATTENDANCE',
        href: '/dashboard/admin/hrm/attendance',
      },
      {
        label: 'LEAVE MANAGEMENT',
        href: '/dashboard/admin/hrm/leaves',
      },
      {
        label: 'PAYROLL',
        href: '/dashboard/admin/hrm/payroll',
      },
      {
        label: 'REPORTS',
        href: '/dashboard/admin/hrm/reports',
      },
    ],
  },
  {
    section: 'Finance & Accounts',
    items: [
      {
        label: 'EXPENSES',
        href: '/dashboard/admin/finance/expenses',
      },
      {
        label: 'INCOME',
        href: '/dashboard/admin/finance/income',
      },
      {
        label: 'INVOICES',
        submenu: [
          { label: 'All Invoices', href: '/dashboard/admin/finance/invoices' },
          { label: 'Invoice Details', href: '/dashboard/admin/finance/invoices/details' },
        ],
      },
      {
        label: 'PAYMENTS',
        href: '/dashboard/admin/finance/payments',
      },
      {
        label: 'TRANSACTIONS',
        href: '/dashboard/admin/finance/transactions',
      },
      {
        label: 'BILLING CONFIGURATION',
        href: '/dashboard/admin/finance/billing-config',
      },
      {
        label: 'REFUNDS',
        href: '/dashboard/admin/finance/refunds',
      },
      {
        label: 'FINANCIAL REPORTS',
        href: '/dashboard/admin/finance/reports',
      },
      {
        label: 'DELIVERY COSTS',
        href: '/dashboard/admin/finance/delivery-costs',
      },
      {
        label: 'SETTLEMENTS',
        href: '/dashboard/admin/finance/settlements',
      },
    ],
  },
  {
    section: 'Reports & Analytics',
    items: [
      {
        label: 'REPORTS',
        submenu: [
          { label: 'All Reports', href: '/dashboard/admin/reports' },
          { label: 'Income Report', href: '/dashboard/admin/reports/income' },
          { label: 'Expenses Report', href: '/dashboard/admin/reports/expenses' },
          { label: 'Profit & Loss', href: '/dashboard/admin/reports/profit-loss' },
          { label: 'Appointments Report', href: '/dashboard/admin/reports/appointments' },
          { label: 'Patients Report', href: '/dashboard/admin/reports/patients' },
          { label: 'Custom Report Builder', href: '/dashboard/admin/reports/custom' },
        ],
      },
    ],
  },
  {
    section: 'Interoperability',
    items: [
      {
        label: 'FHIR ENDPOINTS',
        href: '/dashboard/admin/interoperability/fhir-endpoints',
      },
      {
        label: 'BLOCKCHAIN AUDIT',
        href: '/dashboard/admin/interoperability/blockchain-audit',
      },
      {
        label: 'PROVINCIAL EHR',
        href: '/dashboard/admin/interoperability/provincial-ehr',
      },
    ],
  },
  {
    section: 'Administration',
    items: [
      {
        label: 'PERMISSIONS & ROLES',
        href: '/dashboard/admin/permissions',
      },
      {
        label: 'MESSAGES',
        href: '/dashboard/admin/messages',
      },
      {
        label: 'NOTIFICATIONS',
        href: '/dashboard/admin/notifications',
      },
    ],
  },
  {
    section: 'Settings',
    items: [
      {
        label: 'WEBSITE SETTINGS',
        href: '/dashboard/admin/settings/website',
      },
      {
        label: 'CLINIC SETTINGS',
        href: '/dashboard/admin/settings/clinic',
      },
      {
        label: 'APP SETTINGS',
        href: '/dashboard/admin/settings/app',
      },
      {
        label: 'SYSTEM SETTINGS',
        href: '/dashboard/admin/settings/system',
      },
      {
        label: 'FINANCE SETTINGS',
        href: '/dashboard/admin/settings/finance',
      },
      {
        label: 'ACCOUNT SETTINGS',
        href: '/dashboard/admin/settings/account',
      },
      {
        label: 'OTHER SETTINGS',
        href: '/dashboard/admin/settings/other',
      },
    ],
  },
  {
    section: 'Content Management',
    items: [
      {
        label: 'PAGES',
        href: '/dashboard/admin/content/pages',
      },
      {
        label: 'BLOGS',
        href: '/dashboard/admin/content/blogs',
      },
      {
        label: 'CATEGORIES',
        href: '/dashboard/admin/content/categories',
      },
      {
        label: 'TAGS',
        href: '/dashboard/admin/content/tags',
      },
      {
        label: 'MEDIA LIBRARY',
        href: '/dashboard/admin/content/media',
      },
      {
        label: 'LOCATIONS',
        href: '/dashboard/admin/content/locations',
      },
      {
        label: 'TESTIMONIALS',
        href: '/dashboard/admin/content/testimonials',
      },
      {
        label: 'FAQS',
        href: '/dashboard/admin/content/faqs',
      },
    ],
  },
];

function generateResourceId(path: string): string {
  return path
    .replace(/^\/dashboard\//, '')
    .replace(/\//g, '_')
    .replace(/-/g, '_');
}

export function scanAdminMenuResources(): MenuResource[] {
  const resources: MenuResource[] = [];

  adminMenuStructure.forEach((section) => {
    section.items.forEach((item) => {
      if (item.submenu) {
        if (item.href) {
          resources.push({
            id: generateResourceId(item.href),
            label: item.label,
            path: item.href,
            section: section.section,
            parentMenu: null,
            hasSubmenu: true,
          });
        }

        item.submenu.forEach((sub) => {
          resources.push({
            id: generateResourceId(sub.href),
            label: `${item.label} - ${sub.label}`,
            path: sub.href,
            section: section.section,
            parentMenu: item.label,
            hasSubmenu: false,
          });
        });
      } else if (item.href) {
        resources.push({
          id: generateResourceId(item.href),
          label: item.label,
          path: item.href,
          section: section.section,
          parentMenu: null,
          hasSubmenu: false,
        });
      }
    });
  });

  return resources;
}

export function getResourcesBySection(): Record<string, MenuResource[]> {
  const resources = scanAdminMenuResources();
  const grouped: Record<string, MenuResource[]> = {};

  resources.forEach((resource) => {
    if (!grouped[resource.section]) {
      grouped[resource.section] = [];
    }
    grouped[resource.section].push(resource);
  });

  return grouped;
}

export async function detectNewMenus(existingResourceIds: string[]): Promise<MenuResource[]> {
  const allResources = scanAdminMenuResources();
  return allResources.filter((r) => !existingResourceIds.includes(r.id));
}
