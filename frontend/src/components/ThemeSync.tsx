import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/** Syncs the user's stored theme preference into the local ThemeContext on login. */
export function ThemeSync() {
  const { user } = useAuth();
  const { pref, setPref } = useTheme();
  useEffect(() => {
    if (!user?.preferences?.theme) return;
    if (user.preferences.theme !== pref) setPref(user.preferences.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  return null;
}
