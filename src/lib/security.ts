const ALLOWED_INTERNAL_PREFIXES = [
  '/dashboard/',
  '/frontend/',
  '/auth/',
];

export function isValidInternalUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('/')) return false;
  if (url.includes('//') || url.includes('\\')) return false;
  try {
    const parsed = new URL(url, 'https://placeholder.local');
    if (parsed.hostname !== 'placeholder.local') return false;
  } catch {
    return false;
  }
  return ALLOWED_INTERNAL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return String(str).replace(/[&<>"']/g, (char) => map[char]);
}

export function sanitizeSearchInput(input: string): string {
  return input.replace(/[%_\\,.()"';]/g, '');
}

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
  ],
  medical: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/dicom',
    'application/dicom',
  ],
};

const MAX_FILE_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  medical: 50 * 1024 * 1024,
  default: 10 * 1024 * 1024,
};

export function validateFileUpload(
  file: File,
  category: 'image' | 'document' | 'medical' = 'document'
): { valid: boolean; error?: string } {
  const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default;
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File size exceeds the ${maxMB}MB limit` };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  const allowedTypes = ALLOWED_MIME_TYPES[category];
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type "${file.type}" is not allowed for ${category} uploads` };
  }

  return { valid: true };
}

const VALID_ROLES = new Set(['admin', 'provider', 'patient', 'pharmacy', 'clinic', 'staff', 'public']);

export function isValidRoleName(role: string): boolean {
  return VALID_ROLES.has(role);
}

export function sanitizeSqlIdentifier(name: string): string {
  return name.replace(/[^a-z0-9_]/g, '');
}
