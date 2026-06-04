import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Company, UserProfile, Employee, Site, PayrollSettings, Roster, ShiftType } from '../types';
import { isNamibianPublicHoliday } from '../lib/holidays';
import { useLocalFirstRoster } from '../hooks/useLocalFirstRoster';

interface AppContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  company: Company | null;
  employees: Employee[];
  sites: Site[];
  payrollSettings: PayrollSettings | null;
  rosters: { [employeeId: string]: Roster }; // indexed by employeeId for selectedMonth
  currentMonth: string; // YYYY-MM
  selectedSiteId: string; // filter
  theme: 'light' | 'dark';
  notifications: Array<{ id: string; text: string; time: string; read: boolean }>;
  loading: boolean;
  
  user: UserProfile | null;
  isAuthReady: boolean;
  
  setTheme: (theme: 'light' | 'dark') => void;
  setCurrentMonth: (month: string) => void;
  setSelectedSiteId: (siteId: string) => void;
  addNotification: (text: string) => void;
  clearNotifications: () => void;
  markNotificationsAsRead: () => void;
  dismissNotification: (id: string) => void;
  
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, companyName: string, companyLogo: string, fullName: string, role: 'admin' | 'supervisor') => Promise<void>;
  registerCompany: (companyName: string, companyLogo: string, email: string, password: string, fullName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  upsertEmployee: (employee: Partial<Employee>) => Promise<void>;
  removeEmployee: (employeeId: string) => Promise<void>;
  
  upsertSite: (site: Partial<Site>) => Promise<void>;
  removeSite: (siteId: string) => Promise<void>;

  updatePayrollSettingsDoc: (settings: Partial<PayrollSettings>) => Promise<void>;
  
  updateSingleShift: (employeeId: string, day: string, shift: ShiftType) => Promise<void>;
  executeAutoFill: () => Promise<void>;
  executeClearAll: () => Promise<void>;
  executeClearEmployee: (employeeId: string) => Promise<void>;
  executeSetDayOfWeek: (dayOfWeekName: string, shift: ShiftType) => Promise<void>;
  saveRosterDoc: (employeeId: string, shifts: { [day: string]: ShiftType }) => Promise<void>;

  refreshAllData: () => Promise<void>;
  clearRostersCached: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const isAuthTransitioning = React.useRef(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings | null>(null);
  const [rosters, setRosters, clearRostersCached] = useLocalFirstRoster<{ [employeeId: string]: Roster }>({});
  
  const [currentMonth, setCurrentMonth] = useState<string>("2026-06");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; time: string; read: boolean }>>([
    { id: '1', text: 'Welcome to ShiftWise Namibia! 🇳🇦 Customize your settings and create your first site and employees.', time: 'Just now', read: false }
  ]);

  const addNotification = (text: string) => {
    setNotifications(prev => [
      { id: Date.now().toString(), text, time: 'Just now', read: false },
      ...prev
    ]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Match the redirect trigger authentication if the app returns from a Google OAuth sign-in redirect
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (cred) => {
        if (cred?.user) {
          console.log("Got query credential result from Google redirect, logging in...");
          isAuthTransitioning.current = true;
          setLoading(true);
          try {
            await handleAuthenticatedUserCredential(cred);
          } catch (err) {
            console.error("Error logging in via Google redirect:", err);
          } finally {
            isAuthTransitioning.current = false;
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        console.error("Get redirect result failed:", err);
      });
  }, []);

  // Listen to Auth State (Runs strictly on mount only)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        if (isAuthTransitioning.current) {
          // Skip auto-loading during registration/SSO profile building to avoid prematurely setting demo_company
          setIsAuthReady(true);
          setLoading(false);
          return;
        }
        try {
          // Failsafe 5-second timeout for the initial Firestore profile loading to avoid freezing
          const loadPromise = loadUserProfileAndCompany(user.uid);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout loading profile")), 5000)
          );
          await Promise.race([loadPromise, timeoutPromise]);
        } catch (error) {
          console.error("Auth state change load error, falling back to local demo configuration to prevent locking:", error);
          // Auto fall back to demo company if the connection fails or times out
          setUserProfile({
            id: user.uid,
            company_id: "demo_company",
            name: user.displayName || "Admin User",
            email: user.email || "",
            role: "admin"
          });
          await loadCompanyData("demo_company").catch(e => console.error(e));
        }
      } else {
        setUserProfile(null);
        setCompany(null);
        setEmployees([]);
        setSites([]);
        setPayrollSettings(null);
        setRosters({});
      }
      setIsAuthReady(true);
      setLoading(false);
    });

    // Failsafe backup timer to guarantee the app starts up even under network, cloud, or COOP restrictions
    const backupTimer = setTimeout(() => {
      console.warn("Failsafe backup timer triggered. Activating app UI layer.");
      setIsAuthReady(true);
      setLoading(false);
    }, 3500);

    return () => {
      unsubscribe();
      clearTimeout(backupTimer);
    };
  }, []);

  // Separate effect to load/refresh company data when the selected month changes
  useEffect(() => {
    if (firebaseUser && userProfile?.company_id) {
      setLoading(true);
      loadCompanyData(userProfile.company_id)
        .catch(err => console.error("Error loading company data on month change:", err))
        .finally(() => setLoading(false));
    }
  }, [currentMonth, firebaseUser, userProfile?.company_id]);

  // Load User details and Company Roster
  const loadUserProfileAndCompany = async (uid: string) => {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const uProfile = userDoc.data() as UserProfile;
      setUserProfile(uProfile);

      // Load Company
      const companyDocRef = doc(db, 'companies', uProfile.company_id);
      const companyDoc = await getDoc(companyDocRef);
      if (companyDoc.exists()) {
        const comp = companyDoc.data() as Company;
        setCompany(comp);

        // Fetch other sub-collections in parallel
        await loadCompanyData(uProfile.company_id);
      }
    } else {
      // If user profile doc is missing but user is authed, maybe they logged in with Google for the first time
      // Let's create a placeholder company or prompt company creation in the UI
      setUserProfile({
        id: uid,
        company_id: "demo_company",
        name: auth.currentUser?.displayName || "Admin User",
        email: auth.currentUser?.email || "",
        role: "admin"
      });
      
      // Let's create the demo_company if it doesn't exist
      const demoCompRef = doc(db, 'companies', "demo_company");
      const demoCompSnap = await getDoc(demoCompRef);
      if (!demoCompSnap.exists()) {
        const placeholderComp: Company = {
          id: "demo_company",
          name: "My Security Guard Co",
          plan: "starter",
          created_at: new Date().toISOString()
        };
        await setDoc(demoCompRef, placeholderComp);
      }
      
      await loadCompanyData("demo_company");
    }
  };

  // Load supporting child collections
  const loadCompanyData = async (companyId: string) => {
    try {
      // Employees
      let tempEmployees: Employee[] = [];
      try {
        const empQuery = query(collection(db, "companies", companyId, "employees"));
        const empSnap = await getDocs(empQuery);
        empSnap.forEach(d => {
          tempEmployees.push({ ...d.data(), id: d.id } as Employee);
        });
      } catch (e) {
        console.warn("Could not load employees from Firestore. Falling back to local data if demo.", e);
      }

      // Sites
      let tempSites: Site[] = [];
      try {
        const siteQuery = query(collection(db, "companies", companyId, "sites"));
        const siteSnap = await getDocs(siteQuery);
        siteSnap.forEach(d => {
          tempSites.push({ ...d.data(), id: d.id } as Site);
        });
      } catch (e) {
        console.warn("Could not load sites from Firestore. Falling back to local data if demo.", e);
      }

      // If this is a demo environment, or lists are completely empty, populate detailed Namibian demo datasets
      if (companyId === "demo_company" || companyId.startsWith("demo_") || tempEmployees.length === 0) {
        if (tempSites.length === 0) {
          tempSites = [
            { id: "site_windhoek", company_id: companyId, name: "Windhoek CBD Mall Security Port", location: "Independence Ave, Windhoek 🇳🇦" },
            { id: "site_walvis", company_id: companyId, name: "Walvis Bay Harbor Gate 1", location: "General Murtala Ramat Mohammed Ave, Walvis Bay 🇳🇦" },
            { id: "site_swakopmund", company_id: companyId, name: "Swakopmund Urano-Depot Site", location: "C34 Mine Road, Swakopmund 🇳🇦" }
          ];
        }

        if (tempEmployees.length === 0) {
          tempEmployees = [
            {
              id: "emp_johannes",
              company_id: companyId,
              name: "Johannes Negumbo",
              badge: "SW-001",
              role: "Supervisor",
              site_id: "site_windhoek",
              hourly_rate: 45.0,
              phone: "+264 81 123 4567",
              id_number: "88050601423",
              created_at: new Date().toISOString()
            },
            {
              id: "emp_alfeus",
              company_id: companyId,
              name: "Alfeus Kamati",
              badge: "SW-002",
              role: "Guard",
              site_id: "site_walvis",
              hourly_rate: 35.0,
              phone: "+264 81 765 4321",
              id_number: "92102002345",
              created_at: new Date().toISOString()
            },
            {
              id: "emp_maria",
              company_id: companyId,
              name: "Maria Shikongo",
              badge: "SW-003",
              role: "Guard",
              site_id: "site_windhoek",
              hourly_rate: 35.0,
              phone: "+264 81 999 8811",
              id_number: "95071501198",
              created_at: new Date().toISOString()
            },
            {
              id: "emp_gabriel",
              company_id: companyId,
              name: "Gabriel Shivute",
              badge: "SW-004",
              role: "Team Leader",
              site_id: "site_swakopmund",
              hourly_rate: 40.0,
              phone: "+264 81 555 4422",
              id_number: "85110200874",
              created_at: new Date().toISOString()
            },
            {
              id: "emp_elizabeth",
              company_id: companyId,
              name: "Elizabeth Amunyela",
              badge: "SW-005",
              role: "Guard",
              site_id: "site_walvis",
              hourly_rate: 35.0,
              phone: "+264 81 444 3322",
              id_number: "97123004322",
              created_at: new Date().toISOString()
            }
          ];
        }
      }

      setEmployees(tempEmployees);
      setSites(tempSites);

      // Payroll Settings
      try {
        const payrollRef = doc(db, "companies", companyId, "payroll_settings", "default");
        const payrollSnap = await getDoc(payrollRef);
        if (payrollSnap.exists()) {
          setPayrollSettings(payrollSnap.data() as PayrollSettings);
        } else {
          const defaultPayroll: PayrollSettings = {
            company_id: companyId,
            night_allowance: 15.0, // extra NAD per night hour
            ot_rate: 1.5,
            ot_threshold: 160, // standard hours
            ph_bonus: 250 // flat public holiday worked bonus
          };
          try {
            await setDoc(payrollRef, defaultPayroll);
          } catch (se) {}
          setPayrollSettings(defaultPayroll);
        }
      } catch (err) {
        setPayrollSettings({
          company_id: companyId,
          night_allowance: 15.0,
          ot_rate: 1.5,
          ot_threshold: 160,
          ph_bonus: 250
        });
      }

      // Rosters for this month
      const tempRosters: { [employeeId: string]: Roster } = {};
      try {
        const rosterQuery = query(
          collection(db, "companies", companyId, "roster"),
          where("month", "==", currentMonth)
        );
        const rosterSnap = await getDocs(rosterQuery);
        rosterSnap.forEach(d => {
          const rost = d.data() as Roster;
          tempRosters[rost.employee_id] = rost;
        });
      } catch (err) {
        console.warn("Could not load rosters from Firestore. Generating memory-only slots.", err);
      }

      // Generate staggered shift pattern if rosters are empty
      if (Object.keys(tempRosters).length === 0) {
        const pattern: ('D' | 'N' | 'O')[] = ['D', 'D', 'N', 'N', 'O', 'O'];
        const [year, month] = currentMonth.split("-").map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        tempEmployees.forEach((emp, index) => {
          const docId = `${emp.id}_${currentMonth}`;
          const shifts: { [day: string]: 'D' | 'N' | 'O' | 'X' | 'PH' } = {};
          const stagger = index % pattern.length;

          for (let d = 1; d <= daysInMonth; d++) {
            shifts[String(d)] = pattern[(d - 1 + stagger) % pattern.length];
          }

          tempRosters[emp.id] = {
            id: docId,
            employee_id: emp.id,
            company_id: companyId,
            month: currentMonth,
            shifts,
            updated_at: new Date().toISOString()
          };
        });
      }

      setRosters(tempRosters);

    } catch (err) {
      console.error("Error loading company data:", err);
    }
  };

  const refreshAllData = async () => {
    if (userProfile?.company_id) {
      setLoading(true);
      await loadCompanyData(userProfile.company_id);
      setLoading(false);
    }
  };

  // Email login
  const loginWithEmail = async (email: string, password: string) => {
    // If it's a demo credential, completely bypass standard real Auth network requests
    if ((email === "admin@shiftwise.com.na" || email === "supervisor@shiftwise.com.na") && password === "demo_password") {
      setLoading(true);
      const isSuper = email.startsWith("supervisor");
      const demoProfile: UserProfile = {
        id: isSuper ? "demo_supervisor_uid" : "demo_admin_uid",
        company_id: "demo_company",
        name: isSuper ? "Alfeus Kamati (Supervisor Demo)" : "Johannes Negumbo (Admin Demo)",
        email: email,
        role: isSuper ? "supervisor" : "admin",
        phone: isSuper ? "+264 81 765 4321" : "+264 81 123 4567"
      };

      const demoComp: Company = {
        id: "demo_company",
        name: "Namib Guard Security Corp",
        logo_url: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=100",
        plan: "starter",
        created_at: new Date().toISOString()
      };

      setCompany(demoComp);
      setUserProfile(demoProfile);

      // Attempt to record demo login state in the active DB if accessible, otherwise silent recover
      try {
        const demoCompRef = doc(db, 'companies', "demo_company");
        await setDoc(demoCompRef, demoComp, { merge: true });

        const userDocRef = doc(db, 'users', demoProfile.id);
        await setDoc(userDocRef, demoProfile, { merge: true });
      } catch (err) {
        console.warn("Operating in local memory-only mode. Could not writing to Firestore:", err);
      }

      await loadCompanyData("demo_company");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      throw err;
    }
  };

  // Email Register
  const registerWithEmail = async (
    email: string, 
    password: string, 
    companyName: string, 
    companyLogo: string, 
    fullName: string,
    role: 'admin' | 'supervisor'
  ) => {
    isAuthTransitioning.current = true;
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const companyId = "comp_" + Date.now().toString();

      // Create company document
      const compDocRef = doc(db, 'companies', companyId);
      const newCompany: Company = {
        id: companyId,
        name: companyName,
        logo_url: companyLogo || "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=200",
        plan: 'starter',
        created_at: new Date().toISOString()
      };
      await setDoc(compDocRef, newCompany);

      // Create user profile document
      const userProfileRef = doc(db, 'users', cred.user.uid);
      const newProfile: UserProfile = {
        id: cred.user.uid,
        company_id: companyId,
        name: fullName,
        email,
        role: role,
        phone: ""
      };
      await setDoc(userProfileRef, newProfile);

      // Set state
      setCompany(newCompany);
      setUserProfile(newProfile);
      await loadCompanyData(companyId);
    } catch (err) {
      throw err;
    } finally {
      isAuthTransitioning.current = false;
      setLoading(false);
    }
  };

  // Register Company helper for Register page
  const registerCompany = async (
    companyName: string, 
    companyLogo: string, 
    email: string, 
    password: string, 
    fullName: string
  ) => {
    await registerWithEmail(email, password, companyName, companyLogo, fullName, 'admin');
  };

  // Shared handler for authenticated Google login credential payload processing
  const handleAuthenticatedUserCredential = async (cred: any) => {
    if (!cred?.user) return;
    
    const profileRef = doc(db, 'users', cred.user.uid);
    const profileSnap = await getDoc(profileRef);
    
    if (!profileSnap.exists()) {
      const companyId = "comp_" + Date.now().toString();
      const compDocRef = doc(db, 'companies', companyId);
      
      const newCompany: Company = {
        id: companyId,
        name: (cred.user.displayName || "My Security") + " Corp",
        logo_url: cred.user.photoURL || "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=200",
        plan: 'starter',
        created_at: new Date().toISOString()
      };
      await setDoc(compDocRef, newCompany);

      const newProfile: UserProfile = {
        id: cred.user.uid,
        company_id: companyId,
        name: cred.user.displayName || "Google User",
        email: cred.user.email || "",
        role: 'admin',
        phone: ""
      };
      await setDoc(profileRef, newProfile);

      setCompany(newCompany);
      setUserProfile(newProfile);
      await loadCompanyData(companyId);
    } else {
      const existingProfile = profileSnap.data() as UserProfile;
      setUserProfile(existingProfile);

      const compDocSnap = await getDoc(doc(db, 'companies', existingProfile.company_id));
      if (compDocSnap.exists()) {
        setCompany(compDocSnap.data() as Company);
      }
      await loadCompanyData(existingProfile.company_id);
    }
  };

  // Google Login with automatic direct sandbox iframe fallback to signInWithRedirect
  const loginWithGoogle = async () => {
    isAuthTransitioning.current = true;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Force selection of account
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const isIframe = window.self !== window.top;
      if (isIframe) {
        console.log("Iframe environment detected. Preparing popup login with redirect fallback.");
      }

      try {
        console.log("Attempting smooth Google sign-in via signInWithPopup...");
        const cred = await signInWithPopup(auth, provider);
        await handleAuthenticatedUserCredential(cred);
      } catch (popupErr: any) {
        const errorCode = popupErr.code || "";
        const errorMessage = popupErr.message || "";
        console.warn(`signInWithPopup was blocked/cancelled (code: ${errorCode}, message: ${errorMessage}). Checking if user is actually authenticated...`, popupErr);
        
        // Failsafe check: if the user actually authenticated despite the popup error/COOP block
        let currentUser = auth.currentUser;
        if (!currentUser) {
          // Wait for a few milliseconds to allow the auth listener to receive the token
          for (let i = 0; i < 8; i++) {
            await new Promise(resolve => setTimeout(resolve, 250));
            if (auth.currentUser) {
              currentUser = auth.currentUser;
              break;
            }
          }
        }
        
        if (currentUser) {
          console.log("User is authenticated! Proceeding with credentials recovery for", currentUser.email);
          await handleAuthenticatedUserCredential({ user: currentUser });
          return;
        }

        const isPopupConstraint = 
          errorCode === "auth/popup-blocked" || 
          errorCode === "auth/popup-closed-by-user" || 
          errorCode === "auth/cancelled-popup-request" ||
          errorMessage.toLowerCase().includes("closed") ||
          errorMessage.toLowerCase().includes("block") ||
          errorMessage.toLowerCase().includes("coop") ||
          errorMessage.toLowerCase().includes("cross-origin-opener-policy");

        if (isPopupConstraint) {
          console.warn("Popup blocked or COOP constraint. Triggering fallback page redirection...");
          await signInWithRedirect(auth, provider);
        } else {
          // Rethrow genuine configuration or account errors
          throw popupErr;
        }
      }
    } catch (err: any) {
      console.error("Google login failure:", err);
      throw err;
    } finally {
      isAuthTransitioning.current = false;
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
  };

  // Upsert Employee
  const upsertEmployee = async (empData: Partial<Employee>) => {
    if (!company) return;
    const path = `companies/${company.id}/employees`;
    try {
      const id = empData.id || "emp_" + Date.now().toString();
      const ref = doc(db, "companies", company.id, "employees", id);
      const record = {
        id,
        company_id: company.id,
        name: empData.name || "",
        badge: empData.badge || "",
        role: empData.role || "Guard",
        site_id: empData.site_id || "",
        hourly_rate: empData.hourly_rate || 0,
        photo_url: empData.photo_url || "",
        phone: empData.phone || "",
        id_number: empData.id_number || "",
        created_at: empData.created_at || new Date().toISOString()
      } as Employee;

      await setDoc(ref, record);
      addNotification(`Employee "${record.name}" has been saved.`);
      await loadCompanyData(company.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Remove Employee
  const removeEmployee = async (employeeId: string) => {
    if (!company) return;
    const path = `companies/${company.id}/employees/${employeeId}`;
    try {
      const ref = doc(db, "companies", company.id, "employees", employeeId);
      await deleteDoc(ref);
      addNotification(`Employee deleted.`);
      await loadCompanyData(company.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Upsert Site
  const upsertSite = async (siteData: Partial<Site>) => {
    if (!company) return;
    const path = `companies/${company.id}/sites`;
    try {
      const id = siteData.id || "site_" + Date.now().toString();
      const ref = doc(db, "companies", company.id, "sites", id);
      const record: Site = {
        id,
        company_id: company.id,
        name: siteData.name || "",
        location: siteData.location || ""
      };
      await setDoc(ref, record);
      addNotification(`Site "${record.name}" updated successfully.`);
      await loadCompanyData(company.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Remove Site
  const removeSite = async (siteId: string) => {
    if (!company) return;
    const path = `companies/${company.id}/sites/${siteId}`;
    try {
      const ref = doc(db, "companies", company.id, "sites", siteId);
      await deleteDoc(ref);
      addNotification(`Site deleted.`);
      await loadCompanyData(company.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Update Payroll Settings
  const updatePayrollSettingsDoc = async (settingsData: Partial<PayrollSettings>) => {
    if (!company) return;
    const path = `companies/${company.id}/payroll_settings/default`;
    try {
      const ref = doc(db, "companies", company.id, "payroll_settings", "default");
      const record = {
        ...payrollSettings,
        ...settingsData,
        company_id: company.id
      } as PayrollSettings;
      await setDoc(ref, record);
      setPayrollSettings(record);
      addNotification("Payroll settings updated.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Save Roster Document for single employee
  const saveRosterDoc = async (employeeId: string, shifts: { [day: string]: ShiftType }) => {
    if (!company) return;
    const docId = `${employeeId}_${currentMonth}`;
    const path = `companies/${company.id}/roster/${docId}`;
    try {
      const ref = doc(db, "companies", company.id, "roster", docId);
      const record: Roster = {
        id: docId,
        employee_id: employeeId,
        company_id: company.id,
        month: currentMonth,
        shifts,
        updated_at: new Date().toISOString()
      };
      await setDoc(ref, record);
      
      setRosters(prev => ({
        ...prev,
        [employeeId]: record
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Update a single shift inside employee's shifts map
  const updateSingleShift = async (employeeId: string, day: string, shift: ShiftType) => {
    const currentRoster = rosters[employeeId] || {
      id: `${employeeId}_${currentMonth}`,
      employee_id: employeeId,
      company_id: company?.id || "",
      month: currentMonth,
      shifts: {},
      updated_at: new Date().toISOString()
    };

    const updatedShifts = {
      ...currentRoster.shifts,
      [day]: shift
    };

    await saveRosterDoc(employeeId, updatedShifts);
  };

  // Execute Auto-fill
  // Default rotation pattern: D, D, N, N, O, O
  const executeAutoFill = async () => {
    if (!company || employees.length === 0) return;
    
    // Get total days in month
    const [year, month] = currentMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const pattern: ShiftType[] = ['D', 'D', 'N', 'N', 'O', 'O'];

    try {
      // Loop over employees, staggered starting shifts so we have continuous coverage
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        
        // Skip employees who are filtered out if we filter by site
        if (selectedSiteId && emp.site_id !== selectedSiteId) continue;

        const shifts: { [day: string]: ShiftType } = {};
        const stagger = i % pattern.length;

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          
          if (isNamibianPublicHoliday(dateStr)) {
            // Public holiday auto locked to PH
            shifts[String(d)] = 'PH';
          } else {
            const index = (d - 1 + stagger) % pattern.length;
            shifts[String(d)] = pattern[index];
          }
        }

        await saveRosterDoc(emp.id, shifts);
      }
      
      addNotification(`Roster auto-filled for ${currentMonth} with D, D, N, N, O, O cycle!`);
    } catch (error) {
      console.error("Auto-fill error:", error);
    }
  };

  // Execute Clear All Roster for month
  const executeClearAll = async () => {
    if (!company) return;
    try {
      const activeEmployees = selectedSiteId 
        ? employees.filter(e => e.site_id === selectedSiteId)
        : employees;

      for (const emp of activeEmployees) {
        const docId = `${emp.id}_${currentMonth}`;
        const ref = doc(db, "companies", company.id, "roster", docId);
        await deleteDoc(ref);
      }
      
      addNotification("Cleared all rosters for this month.");
      await loadCompanyData(company.id);
    } catch (error) {
      console.error("Error clearing rosters:", error);
    }
  };

  // Clear single employee roster
  const executeClearEmployee = async (employeeId: string) => {
    if (!company) return;
    try {
      const docId = `${employeeId}_${currentMonth}`;
      const ref = doc(db, "companies", company.id, "roster", docId);
      await deleteDoc(ref);
      
      setRosters(prev => {
        const next = { ...prev };
        delete next[employeeId];
        return next;
      });
      addNotification("Cleared employee roster.");
    } catch (error) {
      console.error("Error clearing employee roster:", error);
    }
  };

  // Set all of a specific day of the week to a shift type
  // e.g., Set all Mondays to 'O' (Off)
  const executeSetDayOfWeek = async (dayOfWeekName: string, shift: ShiftType) => {
    if (!company || employees.length === 0) return;
    const [year, month] = currentMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const daysToUpdate: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      if (dayName.toLowerCase() === dayOfWeekName.toLowerCase()) {
        daysToUpdate.push(String(d));
      }
    }

    try {
      const activeEmployees = selectedSiteId 
        ? employees.filter(e => e.site_id === selectedSiteId)
        : employees;

      for (const emp of activeEmployees) {
        const currentRoster = rosters[emp.id] || {
          id: `${emp.id}_${currentMonth}`,
          employee_id: emp.id,
          company_id: company.id,
          month: currentMonth,
          shifts: {},
          updated_at: new Date().toISOString()
        };

        const updatedShifts = { ...currentRoster.shifts };
        daysToUpdate.forEach(day => {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (!isNamibianPublicHoliday(dateStr)) {
            updatedShifts[day] = shift;
          }
        });

        await saveRosterDoc(emp.id, updatedShifts);
      }
      addNotification(`Set all ${dayOfWeekName}s to "${shift}".`);
    } catch (error) {
      console.error("Error setting day of week:", error);
    }
  };

  return (
    <AppContext.Provider value={{
      firebaseUser,
      userProfile,
      company,
      employees,
      sites,
      payrollSettings,
      rosters,
      currentMonth,
      selectedSiteId,
      theme,
      notifications,
      loading,
      
      user: userProfile,
      isAuthReady,
      
      setTheme,
      setCurrentMonth,
      setSelectedSiteId,
      addNotification,
      clearNotifications,
      markNotificationsAsRead,
      dismissNotification,
      
      loginWithEmail,
      registerWithEmail,
      registerCompany,
      loginWithGoogle,
      logout,
      
      upsertEmployee,
      removeEmployee,
      upsertSite,
      removeSite,
      updatePayrollSettingsDoc,
      
      updateSingleShift,
      executeAutoFill,
      executeClearAll,
      executeClearEmployee,
      executeSetDayOfWeek,
      saveRosterDoc,

      refreshAllData,
      clearRostersCached
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
