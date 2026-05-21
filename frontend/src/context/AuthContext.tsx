import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  auth,
  onAuthStateChanged,
  isEmailAllowed,
  signInWithGoogle,
  signOut,
  DEV_MODE,
  type User,
} from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  devMode: boolean;
}

// Minimal fake user for dev mode (matches the User shape the UI needs)
const DEV_USER = {
  uid: 'dev-user',
  email: 'dev@localhost',
  displayName: 'Dev User',
  photoURL: null,
  getIdToken: async () => 'dev-token',
} as unknown as User;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(DEV_MODE ? DEV_USER : null);
  const [loading, setLoading] = useState(!DEV_MODE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEV_MODE) {
      console.log('[auth] Dev mode — Firebase not configured, auto-logged in as dev user');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && isEmailAllowed(firebaseUser.email)) {
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    if (DEV_MODE) {
      setUser(DEV_USER);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(DEV_MODE ? DEV_USER : null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, logout, clearError, devMode: DEV_MODE }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
