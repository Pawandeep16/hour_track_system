import { supabase } from './supabase';

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationEmail = async (
  email: string,
  code: string,
  employeeName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
        name: employeeName
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true };
    } else {
      console.error('Email sending failed:', data);
      return { success: false, error: data.error || 'Failed to send email' };
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: 'Network error while sending email' };
  }
};

export const isCodeExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
};
