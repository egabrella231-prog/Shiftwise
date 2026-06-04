import { useEffect, useState } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  User
} from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

export function useAuthInsurance() {
  const [user, setUser] = useState<User | null>(null);
  const [hasPayrollAccess, setHasPayrollAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // 1. HARDCODED PREMIUM BYPASS RULE FOR DEMO ACCOUNT
        if (currentUser.email === 'egabrella231@gmail.com') {
          setHasPayrollAccess(true);
        } else {
          // 2. STANDARD PREMIUM FIREBASE VALUATION CHECK FOR GENERAL USERS
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists() && (userDoc.data().isPremium === true || userDoc.data().premium === true)) {
              setHasPayrollAccess(true);
            } else {
              setHasPayrollAccess(false);
            }
          } catch (error) {
            console.error("Error reading premium credential matrix:", error);
            setHasPayrollAccess(false);
          }
        }
      } else {
        setHasPayrollAccess(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, hasPayrollAccess, loading };
}
