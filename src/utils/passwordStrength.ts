export interface PasswordCheckItem {
  id: 'length' | 'upper' | 'lower' | 'number' | 'special' | 'pattern';
  label: string;
  passed: boolean;
}

export interface PasswordStrengthResult {
  isValid: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Empty' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  errorMessage: string | null;
  checks: PasswordCheckItem[];
}

const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  '987654321',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'welcome123',
  'iloveyou',
  'letmein123',
  'abc12345',
  'abcd1234',
  '00000000',
  '11111111',
  'pass@123',
  'admin@123',
  'test@123',
]);

function hasObviousSequenceOrRepetition(pw: string): boolean {
  const lower = pw.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(lower)) return true;
  // Same character repeated 4+ times in a row (e.g., 1111, aaaa)
  if (/(.)\1{3,}/.test(pw)) return true;
  // Long ascending/descending numeric or keyboard sequence of 5+ chars
  const sequences = ['0123456789', '9876543210', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  for (const seq of sequences) {
    for (let i = 0; i <= seq.length - 5; i += 1) {
      if (lower.includes(seq.slice(i, i + 5))) {
        return true;
      }
    }
  }
  return false;
}

export function evaluatePasswordStrength(
  password: string,
  email?: string
): PasswordStrengthResult {
  const pw = password || '';
  const hasMinLength = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(pw);
  const hasNoSpaces = !/\s/.test(pw);

  const emailLocal = (email || '').trim().toLowerCase().split('@')[0] || '';
  const containsEmailName = emailLocal.length >= 4 && pw.toLowerCase().includes(emailLocal);
  const isNotWeakPattern =
    pw.length > 0 && hasNoSpaces && !hasObviousSequenceOrRepetition(pw) && !containsEmailName;

  const checks: PasswordCheckItem[] = [
    { id: 'length', label: '8+ chars', passed: hasMinLength },
    { id: 'upper', label: 'A-Z', passed: hasUpper },
    { id: 'lower', label: 'a-z', passed: hasLower },
    { id: 'number', label: '0-9', passed: hasNumber },
    { id: 'special', label: '@#$!', passed: hasSpecial },
    { id: 'pattern', label: 'Not common/sequential', passed: isNotWeakPattern },
  ];

  const isValid =
    hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && isNotWeakPattern;

  let errorMessage: string | null = null;
  if (!hasMinLength) {
    errorMessage = 'Password must be at least 8 characters long (e.g. Teqqno@2026).';
  } else if (!hasNoSpaces) {
    errorMessage = 'Password cannot contain spaces.';
  } else if (!hasUpper) {
    errorMessage = 'Include at least 1 uppercase letter (A-Z) for a strong password.';
  } else if (!hasLower) {
    errorMessage = 'Include at least 1 lowercase letter (a-z) for a strong password.';
  } else if (!hasNumber) {
    errorMessage = 'Include at least 1 number (0-9) for a strong password.';
  } else if (!hasSpecial) {
    errorMessage = 'Include at least 1 special character (e.g. @ # $ ! % &) for a strong password.';
  } else if (containsEmailName) {
    errorMessage = 'Password should not contain your email username.';
  } else if (!isNotWeakPattern) {
    errorMessage = 'Password is too simple or sequential (avoid 12345, qwerty, or repeated characters).';
  }

  if (!pw) {
    return { isValid: false, score: 0, label: 'Empty', errorMessage, checks };
  }

  const corePassedCount = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  let score: 0 | 1 | 2 | 3 | 4 = 1;
  if (isValid) {
    score = 4;
  } else if (!isNotWeakPattern || corePassedCount <= 2) {
    score = 1;
  } else if (corePassedCount === 3) {
    score = 2;
  } else {
    score = 3;
  }

  const labelMap: Record<1 | 2 | 3 | 4, 'Weak' | 'Fair' | 'Good' | 'Strong'> = {
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
  };

  return {
    isValid,
    score,
    label: labelMap[score],
    errorMessage,
    checks,
  };
}
