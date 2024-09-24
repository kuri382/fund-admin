// /context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const [isClient, setIsClient] = useState(false); // クライアントサイドかどうかの判定
  const router = useRouter();

  useEffect(() => {
    setIsClient(true); // コンポーネントがクライアントサイドでマウントされたことを確認
  }, []);

  useEffect(() => {
    if (isClient) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [auth, isClient]);

  const signOut = async () => {
    if (isClient) {
      await firebaseSignOut(auth);
      setUser(null);
      router.push('/signin');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType | null => useContext(AuthContext);
