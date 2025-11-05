import { supabase } from './supabase';

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationEmail = async (email: string, code: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        data: {
          verification_code: code
        }
      }
    });

    return !error;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

export const isCodeExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
};
