/**
 * Utility function to translate Supabase Auth error messages from English to Turkish
 */

export function translateAuthError(errorMessage: string): string {
  const errorMap: { [key: string]: string } = {
    // Common authentication errors
    'Invalid login credentials': 'Geçersiz e-posta veya şifre',
    'Email not confirmed': 'E-posta adresiniz doğrulanmamış',
    'User not found': 'Kullanıcı bulunamadı',
    'Invalid email': 'Geçersiz e-posta adresi',
    'Too many requests': 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin',
    'Network error': 'Ağ hatası. İnternet bağlantınızı kontrol edin',
    
    // Signup errors
    'Signup is disabled': 'Kayıt olma devre dışı',
    'Email already registered': 'Bu e-posta adresi zaten kayıtlı',
    'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalıdır',
    'Unable to validate email address': 'E-posta adresi doğrulanamıyor',
    
    // Rate limiting
    'For security purposes, you can only request this once every 60 seconds': 'Güvenlik nedeniyle bu işlemi 60 saniyede bir kez yapabilirsiniz',
    
    // Password reset
    'Password reset failed': 'Şifre sıfırlama başarısız',
    'Invalid token': 'Geçersiz token',
    'Token expired': 'Token süresi dolmuş',
    
    // Email verification
    'Email confirmation failed': 'E-posta doğrulama başarısız',
    'Confirmation token expired': 'Doğrulama token süresi dolmuş',
    
    // Account management
    'Account not found': 'Hesap bulunamadı',
    'Account disabled': 'Hesap devre dışı',
    'Invalid password': 'Geçersiz şifre',
    
    // General errors
    'An unexpected error occurred': 'Beklenmeyen bir hata oluştu',
    'Service unavailable': 'Servis kullanılamıyor',
    'Database error': 'Veritabanı hatası'
  };

  // Check for exact matches first
  if (errorMap[errorMessage]) {
    return errorMap[errorMessage];
  }

  // Check for partial matches (case insensitive)
  const lowerErrorMessage = errorMessage.toLowerCase();
  for (const [english, turkish] of Object.entries(errorMap)) {
    if (lowerErrorMessage.includes(english.toLowerCase())) {
      return turkish;
    }
  }

  // If no translation found, return original message
  return errorMessage;
}

/**
 * Common Turkish error messages for auth operations
 */
export const AuthErrorMessages = {
  LOGIN_FAILED: 'Giriş başarısız',
  SIGNUP_FAILED: 'Kayıt başarısız',
  INVALID_CREDENTIALS: 'Geçersiz e-posta veya şifre',
  EMAIL_NOT_CONFIRMED: 'E-posta adresiniz doğrulanmamış',
  USER_NOT_FOUND: 'Kullanıcı bulunamadı',
  EMAIL_ALREADY_EXISTS: 'Bu e-posta adresi zaten kayıtlı',
  WEAK_PASSWORD: 'Şifre çok zayıf',
  NETWORK_ERROR: 'Ağ hatası. İnternet bağlantınızı kontrol edin',
  TOO_MANY_REQUESTS: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin',
  ACCOUNT_DISABLED: 'Hesap devre dışı',
  UNEXPECTED_ERROR: 'Beklenmeyen bir hata oluştu'
} as const;
