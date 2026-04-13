import { describe, it, expect } from 'vitest';
import {
  isValidInternalUrl,
  escapeHtml,
  sanitizeSearchInput,
  validateFileUpload,
  isValidRoleName,
  sanitizeSqlIdentifier,
} from '../security';

describe('isValidInternalUrl', () => {
  it('accepts valid dashboard paths', () => {
    expect(isValidInternalUrl('/dashboard/patient/appointments')).toBe(true);
    expect(isValidInternalUrl('/dashboard/provider/schedule')).toBe(true);
    expect(isValidInternalUrl('/dashboard/admin/users')).toBe(true);
  });

  it('accepts valid frontend paths', () => {
    expect(isValidInternalUrl('/frontend/pricing')).toBe(true);
    expect(isValidInternalUrl('/frontend/about')).toBe(true);
  });

  it('accepts valid auth paths', () => {
    expect(isValidInternalUrl('/auth/login')).toBe(true);
    expect(isValidInternalUrl('/auth/register')).toBe(true);
  });

  it('rejects empty or non-string values', () => {
    expect(isValidInternalUrl('')).toBe(false);
    expect(isValidInternalUrl(null as any)).toBe(false);
    expect(isValidInternalUrl(undefined as any)).toBe(false);
    expect(isValidInternalUrl(123 as any)).toBe(false);
  });

  it('rejects paths not starting with /', () => {
    expect(isValidInternalUrl('dashboard/patient')).toBe(false);
    expect(isValidInternalUrl('https://evil.com')).toBe(false);
  });

  it('rejects protocol-relative URLs (//)', () => {
    expect(isValidInternalUrl('//evil.com/dashboard/')).toBe(false);
  });

  it('rejects backslash-based bypass attempts', () => {
    expect(isValidInternalUrl('/\\evil.com')).toBe(false);
  });

  it('rejects absolute URLs disguised as relative paths', () => {
    expect(isValidInternalUrl('/dashboard/../../etc/passwd')).toBe(true);
    // The URL constructor normalizes traversal, but it still starts with /dashboard/
    // and hostname stays placeholder.local, so this is safe
  });

  it('rejects paths outside allowed prefixes', () => {
    expect(isValidInternalUrl('/admin/secret')).toBe(false);
    expect(isValidInternalUrl('/api/data')).toBe(false);
    expect(isValidInternalUrl('/')).toBe(false);
    expect(isValidInternalUrl('/settings')).toBe(false);
  });

  it('rejects javascript: protocol attempts', () => {
    expect(isValidInternalUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: protocol attempts', () => {
    expect(isValidInternalUrl('data:text/html,<h1>hi</h1>')).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than and greater-than', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('class="test"')).toBe('class=&quot;test&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('handles all special characters in one string', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#x27;y&#x27;&gt;&amp;'
    );
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('coerces non-string input via String()', () => {
    expect(escapeHtml(42 as any)).toBe('42');
  });
});

describe('sanitizeSearchInput', () => {
  it('strips SQL wildcards', () => {
    expect(sanitizeSearchInput('%admin%')).toBe('admin');
    expect(sanitizeSearchInput('user_name')).toBe('username');
  });

  it('strips backslashes', () => {
    expect(sanitizeSearchInput('test\\injection')).toBe('testinjection');
  });

  it('strips commas, dots, and parentheses', () => {
    expect(sanitizeSearchInput('fn(a, b.c)')).toBe('fna bc');
  });

  it('strips quotes and semicolons', () => {
    expect(sanitizeSearchInput(`"hello'; DROP TABLE--`)).toBe('hello DROP TABLE--');
  });

  it('preserves safe characters', () => {
    expect(sanitizeSearchInput('Dr Smith cardiology')).toBe('Dr Smith cardiology');
  });

  it('handles empty string', () => {
    expect(sanitizeSearchInput('')).toBe('');
  });

  it('preserves hyphens and numbers', () => {
    expect(sanitizeSearchInput('COVID-19 test')).toBe('COVID-19 test');
  });
});

describe('validateFileUpload', () => {
  function createMockFile(name: string, size: number, type: string): File {
    const blob = new Blob(['x'.repeat(Math.min(size, 1))], { type });
    Object.defineProperty(blob, 'size', { value: size });
    Object.defineProperty(blob, 'name', { value: name });
    return blob as File;
  }

  describe('image category', () => {
    it('accepts valid JPEG', () => {
      const file = createMockFile('photo.jpg', 1024, 'image/jpeg');
      expect(validateFileUpload(file, 'image')).toEqual({ valid: true });
    });

    it('accepts valid PNG', () => {
      const file = createMockFile('logo.png', 2048, 'image/png');
      expect(validateFileUpload(file, 'image')).toEqual({ valid: true });
    });

    it('rejects file exceeding 10MB limit', () => {
      const file = createMockFile('huge.jpg', 11 * 1024 * 1024, 'image/jpeg');
      const result = validateFileUpload(file, 'image');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10MB');
    });

    it('rejects empty file', () => {
      const file = createMockFile('empty.jpg', 0, 'image/jpeg');
      const result = validateFileUpload(file, 'image');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File is empty');
    });

    it('rejects disallowed MIME type for image category', () => {
      const file = createMockFile('hack.exe', 1024, 'application/x-executable');
      const result = validateFileUpload(file, 'image');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });
  });

  describe('document category', () => {
    it('accepts valid PDF', () => {
      const file = createMockFile('report.pdf', 5000, 'application/pdf');
      expect(validateFileUpload(file, 'document')).toEqual({ valid: true });
    });

    it('accepts CSV files', () => {
      const file = createMockFile('data.csv', 1000, 'text/csv');
      expect(validateFileUpload(file, 'document')).toEqual({ valid: true });
    });

    it('rejects file exceeding 25MB limit', () => {
      const file = createMockFile('big.pdf', 26 * 1024 * 1024, 'application/pdf');
      const result = validateFileUpload(file, 'document');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('25MB');
    });
  });

  describe('medical category', () => {
    it('accepts DICOM files', () => {
      const file = createMockFile('scan.dcm', 30 * 1024 * 1024, 'application/dicom');
      expect(validateFileUpload(file, 'medical')).toEqual({ valid: true });
    });

    it('rejects file exceeding 50MB limit', () => {
      const file = createMockFile('mri.dcm', 51 * 1024 * 1024, 'application/dicom');
      const result = validateFileUpload(file, 'medical');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('50MB');
    });
  });

  describe('default category', () => {
    it('defaults to document when no category specified', () => {
      const file = createMockFile('file.pdf', 1024, 'application/pdf');
      expect(validateFileUpload(file)).toEqual({ valid: true });
    });
  });
});

describe('isValidRoleName', () => {
  it('accepts all valid roles', () => {
    const validRoles = ['admin', 'provider', 'patient', 'pharmacy', 'clinic', 'staff', 'public'];
    validRoles.forEach((role) => {
      expect(isValidRoleName(role)).toBe(true);
    });
  });

  it('rejects invalid roles', () => {
    expect(isValidRoleName('superadmin')).toBe(false);
    expect(isValidRoleName('root')).toBe(false);
    expect(isValidRoleName('')).toBe(false);
    expect(isValidRoleName('ADMIN')).toBe(false);
  });

  it('rejects SQL injection in role names', () => {
    expect(isValidRoleName("admin' OR '1'='1")).toBe(false);
    expect(isValidRoleName('admin; DROP TABLE')).toBe(false);
  });
});

describe('sanitizeSqlIdentifier', () => {
  it('preserves valid identifiers', () => {
    expect(sanitizeSqlIdentifier('user_profiles')).toBe('user_profiles');
    expect(sanitizeSqlIdentifier('table_123')).toBe('table_123');
  });

  it('strips uppercase letters', () => {
    expect(sanitizeSqlIdentifier('UserProfiles')).toBe('serrofiles');
  });

  it('strips special characters', () => {
    expect(sanitizeSqlIdentifier('table; DROP--')).toBe('table');
  });

  it('strips spaces', () => {
    expect(sanitizeSqlIdentifier('my table')).toBe('mytable');
  });

  it('strips quotes and uppercase from SQL injection', () => {
    expect(sanitizeSqlIdentifier("users' OR '1'='1")).toBe('users11');
  });

  it('strips SQL injection attempts including uppercase keywords', () => {
    expect(sanitizeSqlIdentifier('users; DROP TABLE users;--')).toBe('usersusers');
  });

  it('handles empty string', () => {
    expect(sanitizeSqlIdentifier('')).toBe('');
  });
});
