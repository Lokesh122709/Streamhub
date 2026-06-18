import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { ServiceGrid } from "./components/ServiceGrid";
import { ServiceDetails } from "./components/ServiceDetails";
import { CheckoutScreen } from "./components/CheckoutScreen";
import { MyOrders } from "./components/MyOrders";
import { OTTSubscription } from "./data/ottData";
import { authService, GoogleUser } from "./lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Mail, Sparkles, AlertTriangle, Key, Users, Check, Globe, Megaphone } from "lucide-react";
import { settingsService, AppSettings } from "./lib/settings";
import { AdminPanel } from "./components/AdminPanel";

export default function App() {
  const [view, setView] = useState<"grid" | "details" | "checkout" | "orders">("grid");
  const [selectedService, setSelectedService] = useState<OTTSubscription | null>(null);
  const [currentUser, setCurrentUser] = useState<GoogleUser | null>(authService.getCurrentUser());
  const [showWelcome, setShowWelcome] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [servicesList, setServicesList] = useState<OTTSubscription[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);

  // Email and Name states
  const [authMethod, setAuthMethod] = useState<"login" | "register">("login");
  const [emailVal, setEmailVal] = useState("");
  const [displayNameVal, setDisplayNameVal] = useState("");

  // Real Email OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpVal, setOtpVal] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  useEffect(() => {
    // Unsubscribe listener when app unmounts
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
    });

    // Populate dynamic settings and custom catalog from Firestore
    const initDynamicConfigs = async () => {
      try {
        const [loadedSettings, loadedServices] = await Promise.all([
          settingsService.getSettings(),
          settingsService.getServices()
        ]);
        setAppSettings(loadedSettings);
        setServicesList(loadedServices);
      } catch (err) {
        console.warn("Dynamic configs loading met an error (using standard memory defaults):", err);
      }
    };
    initDynamicConfigs();

    return unsubscribe;
  }, []);

  const handleSelectService = (service: OTTSubscription) => {
    setSelectedService(service);
    setView("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBuyNow = () => {
    if (!currentUser) {
      setLoginError(null);
      setShowWelcome(true);
    } else {
      setView("checkout");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleModalSignIn = async () => {
    setIsSigningIn(true);
    setLoginError(null);
    try {
      const user = await authService.loginWithGoogle();
      setCurrentUser(user);
      setShowWelcome(false);
      setView("checkout");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Sign-In failed:", err);
      if (err instanceof Error) {
        setLoginError(err.message || "Failed to log in.");
      } else {
        setLoginError("Authentication encounter. Please verify your real credentials configurations.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailVal || (authMethod === "register" && !displayNameVal)) {
      setLoginError("Please enter all required fields. (कृपया सभी आवश्यक जानकारी दर्ज करें।)");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal.trim())) {
      setLoginError("Please enter a valid, active email address. (कृपया एक मान्य ईमेल आईडी दर्ज करें।)");
      return;
    }

    setIsSendingOtp(true);
    setLoginError(null);
    setOtpMessage(null);

    try {
      const res = await authService.sendOtp(emailVal.trim());
      setOtpSent(true);
      setOtpMessage(res.message);
    } catch (err: any) {
      console.error("OTP send failed:", err);
      setLoginError(err.message || "Failed to send real OTP. Please make sure server SMTP is configured.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVal || otpVal.trim().length < 5) {
      setLoginError("Please enter a valid 6-digit verification code. (कृपया एक मान्य 6-अंकीय कोड दर्ज करें।)");
      return;
    }

    setIsSigningIn(true);
    setLoginError(null);

    try {
      const user = await authService.verifyOtp(emailVal.trim(), otpVal.trim(), displayNameVal.trim() || undefined);
      setCurrentUser(user);
      setShowWelcome(false);
      
      // Clean up fields on success
      setEmailVal("");
      setOtpVal("");
      setDisplayNameVal("");
      setOtpSent(false);
      setOtpMessage(null);
      
      setView("checkout");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("OTP verification failed:", err);
      setLoginError(err.message || "Incorrect or expired verification code. Please request a new OTP.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between selection:bg-indigo-600/20 overflow-x-hidden">
      
      {/* Visual Ambient Space Glow Particles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full filter blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-violet-500/5 rounded-full filter blur-[80px] pointer-events-none z-0"></div>

      {/* Dynamic Announcement Banner controlled from the Admin Panel */}
      {appSettings?.showBanner && appSettings?.bannerText && (
        <div className="relative z-50 bg-gradient-to-r from-indigo-800 via-indigo-600 to-blue-600 text-white py-2.5 px-4 text-center text-xs font-semibold shadow-md border-b border-indigo-700/30 flex items-center justify-center gap-2">
          <Megaphone className="w-4 h-4 text-yellow-300 shrink-0" />
          <span>{appSettings.bannerText}</span>
        </div>
      )}

      {/* Modern Header Navigation */}
      <Header 
        onUserChange={(u) => setCurrentUser(u)} 
        onOpenAuth={() => {
          setLoginError(null);
          setShowWelcome(true);
        }}
        onNavigate={(targetView) => {
          setView(targetView);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        activeView={view}
        onOpenAdmin={() => setShowAdmin(true)}
      />

      {/* Main Container screen transitions */}
      <main className="flex-grow w-full relative">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: THE CATALOGUE GRID */}
          {view === "grid" && (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.45 }}
            >
              <ServiceGrid onSelectService={handleSelectService} services={servicesList} />
            </motion.div>
          )}

          {/* SCREEN 2: SERVICE DESCRIPTION & DETAILS */}
          {view === "details" && selectedService && (
            <motion.div
              key="details"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
            >
              <ServiceDetails
                service={selectedService}
                onBack={() => setView("grid")}
                onBuy={handleBuyNow}
              />
            </motion.div>
          )}

          {/* SCREEN 3: PAYMENT CHECKOUT */}
          {view === "checkout" && selectedService && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45 }}
            >
              <CheckoutScreen
                service={selectedService}
                user={currentUser}
                onBack={() => setView("details")}
                settings={appSettings}
              />
            </motion.div>
          )}

          {/* SCREEN 4: MY ORDERS SECTION */}
          {view === "orders" && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.45 }}
            >
              <MyOrders
                user={currentUser}
                onBack={() => setView("grid")}
                settings={appSettings}
              />
            </motion.div>
          )}



        </AnimatePresence>
      </main>

      {/* Interactive Floating Google SignIn Required Prompt */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl shadow-indigo-150 relative my-6"
            >
              <div className="mx-auto w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>

              <span className="text-[10px] font-mono tracking-widest text-indigo-600 uppercase block mb-1 font-bold">
                MEMBERSHIP CHECKPOINT
              </span>
              <h3 className="font-display font-medium text-lg text-slate-800 mb-1">
                Access Stream Hub Account
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed mb-4 text-center px-1">
                Join our premium OTT membership or login to retrieve existing active slot allocations.
              </p>

              {/* Tab Switcher for Email/Password */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("login");
                    setLoginError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    authMethod === "login"
                      ? "bg-white text-slate-800 shadow"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Sign In (Login)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("register");
                    setLoginError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    authMethod === "register"
                      ? "bg-white text-slate-800 shadow"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Join (Sign Up)
                </button>
              </div>

              {/* Real Email OTP Flow Forms */}
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="text-left space-y-3.5 mb-4 animate-fadeIn">
                  {authMethod === "register" && (
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                        Full Name (पूरा नाम)
                      </label>
                      <input
                        type="text"
                        required
                        value={displayNameVal}
                        onChange={(e) => setDisplayNameVal(e.target.value)}
                        placeholder="e.g. Abhi Kumar"
                        className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition placeholder:text-slate-300"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                      Real Email ID (वास्तविक ईमेल आईडी)
                    </label>
                    <input
                      type="email"
                      required
                      value={emailVal}
                      onChange={(e) => setEmailVal(e.target.value)}
                      placeholder="e.g. user@gmail.com"
                      className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition placeholder:text-slate-300"
                    />
                    <p className="text-[9px] text-slate-400 mt-1 font-medium leading-relaxed">
                      We will send a real 6-digit security code (OTP) to this inbox.
                    </p>
                  </div>

                  {isSendingOtp ? (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-center space-x-2 text-xs text-indigo-700 font-semibold shadow-inner w-full">
                      <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Sending security OTP to inbox...</span>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer shadow-md hover:shadow-lg text-center flex items-center justify-center space-x-1.5"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <span>{authMethod === "login" ? "Get Verification OTP" : "Join & Get OTP"}</span>
                    </button>
                  )}
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="text-left space-y-3.5 mb-4 animate-fadeIn">
                  {otpMessage && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 font-medium leading-relaxed">
                      <div className="flex items-center space-x-1.5 mb-0.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <strong className="font-semibold">Security code dispatched!</strong>
                      </div>
                      We sent a 6-digit verification code to <span className="underline font-mono">{emailVal.trim()}</span>.
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1 flex justify-between items-center">
                      <span>Enter 6-digit OTP (ओटीपी दर्ज करें)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setLoginError(null);
                        }}
                        className="text-[9px] text-indigo-600 lowercase hover:underline font-semibold font-sans cursor-pointer focus:outline-none"
                      >
                        Change Email →
                      </button>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={otpVal}
                      onChange={(e) => setOtpVal(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 123456"
                      className="w-full px-3.5 py-2.5 text-center font-mono text-base tracking-[0.4em] font-bold text-indigo-700 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition placeholder:text-slate-300"
                    />
                  </div>

                  {isSigningIn ? (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-center space-x-2 text-xs text-indigo-700 font-semibold shadow-inner w-full">
                      <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verifying security key...</span>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer shadow-md hover:shadow-lg text-center flex items-center justify-center space-x-1.5"
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Verify & Access Account</span>
                    </button>
                  )}

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[10px] text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
                    >
                      Did not receive code? Resend OTP
                    </button>
                  </div>
                </form>
              )}

              {/* Separator Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute w-full border-t border-slate-150"></div>
                <span className="relative px-3 bg-white text-[10px] uppercase font-mono font-bold text-slate-400 select-none">
                  Or use security partner
                </span>
              </div>

              {/* Secure Google Authentication */}
              <div className="text-left mb-4">
                {isSigningIn ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center space-x-2 text-xs text-slate-500 font-medium">
                    <span>Checking Google Link...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleModalSignIn}
                    className="w-full py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2.5 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63zm0-4.18V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09z" fill="transparent"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Instant Sign in with Google</span>
                  </button>
                )}
              </div>

              {/* Show admin config hint if using dummy key */}
              {authService.isConfigDummy() && (
                <div className="p-2.5 bg-yellow-50 border border-yellow-150 rounded-xl text-[9px] text-yellow-800 text-left leading-normal font-sans mb-3 select-none font-medium">
                  <strong>⚠ Setup Hint:</strong> Sandbox mode is active! To go fully live, ensure real Firebase credentials are saved.
                </div>
              )}

              {/* Real sign-in error display */}
              {loginError && (
                <div className="space-y-2 mb-3">
                  {loginError === "unauthorized-domain" ? (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-left font-sans text-slate-700">
                      <div className="flex items-center space-x-1.5 mb-2.5 text-rose-800 font-bold text-xs border-b border-rose-100 pb-1.5">
                        <Sparkles className="w-4 h-4 text-rose-600 animate-pulse shrink-0" />
                        <span>Fix: Firebase Domain Unauthorized (डोमेन ऑथराइज करें)</span>
                      </div>
                      
                      <p className="text-[10px] font-medium text-slate-650 mb-2.5 leading-relaxed">
                        यह ऐप अभी <strong>Vercel Domain</strong> पर चल रहा है (<code>{window.location.hostname}</code>)। सुरक्षा कारणों से Google Sign-In तब तक ब्लॉक रहेगा जब तक आप इसे अपने Firebase Console में ऑथराइज नहीं करते। इसे तुरंत बाईपास या ठीक करने के तरीके:
                      </p>

                      <div className="space-y-3">
                        {/* Option 1: Instant Bypass Button */}
                        <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                          <span className="block text-[9px] font-bold text-indigo-800 uppercase tracking-wide mb-1">
                            🚀 तरीका A: Instant Access Bypass (तुरंत लॉगिन)
                          </span>
                          <p className="text-[9px] text-slate-500 mb-2 leading-relaxed">
                            बिना किसी सेटअप के तुरंत वेबसाइट को पूरी फीचर्स के साथ एक्सेस करने के लिए नीचे दिए गए बटन पर क्लिक करें। यह आपको तुरंत सुरक्षित तरीके से लॉगिन कर देगा।
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              setIsSigningIn(true);
                              try {
                                const user = await authService.signInWithDemoGoogleAccount("lr4239469@gmail.com", "Lokesh Rathi");
                                setCurrentUser(user);
                                setShowWelcome(false);
                                setView("checkout");
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              } catch (demoErr: any) {
                                setLoginError(demoErr.message);
                              } finally {
                                setIsSigningIn(false);
                              }
                            }}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition flex items-center justify-center space-x-1.5 shadow cursor-pointer"
                          >
                            <span>🎯 Skip Setup & Login with Google Identity</span>
                          </button>
                        </div>

                        {/* Option 2: Step-by-step documentation */}
                        <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                          <span className="block text-[9px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                            🔒 तरीका B: Firebase Console में शामिल करें (1 मिनट)
                          </span>
                          <ol className="list-decimal pl-3.5 text-[9px] space-y-1.5 text-slate-600 font-medium leading-relaxed">
                            <li>
                              अपने <strong>Firebase Console</strong> में जाएं और अपना प्रोजेक्ट खोलें।
                            </li>
                            <li>
                              बाईं ओर <strong>Authentication</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Authorized Domains</strong> पर जाएं।
                            </li>
                            <li>
                              <strong>Add Domain</strong> पर क्लिक करके ठीक यह पता दर्ज करें:
                              <div className="bg-slate-50 border border-slate-150 p-1.5 mt-1 rounded font-mono text-[9px] select-all flex justify-between items-center text-indigo-800 font-bold">
                                <code>{window.location.hostname}</code>
                                <span className="text-[7.5px] bg-indigo-100 text-indigo-800 px-1 rounded select-none uppercase tracking-wider">Click to Copy</span>
                              </div>
                            </li>
                            <li>
                              सेव कर दें! उसके बाद गूगल साइन-इन चुटकियों में काम करना शुरू कर देगा।
                            </li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-700 text-left leading-relaxed font-sans">
                      <strong>Authentication Failed:</strong> {loginError}
                    </div>
                  )}

                  {/* Dynamic interactive setup guide if SMTP parameters are missing */}
                  {loginError.includes("SMTP") && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-left font-sans text-slate-700">
                      <div className="flex items-center space-x-1.5 mb-2 text-indigo-800 font-semibold text-xs border-b border-indigo-150 pb-1.5">
                        <Sparkles className="w-4 h-4 shrink-0 text-indigo-600 animate-pulse" />
                        <span>How to Setup Real Gmail OTP (ओटीपी चालू करें)</span>
                      </div>
                      
                      <p className="text-[10px] font-medium text-slate-600 mb-2 leading-relaxed">
                        इन्बॉक्स पर असली वेरिफिकेशन कोड भेजने के लिए, आपको ऐप की सेटिंग्स (Settings Panel) में अपने ईमेल क्रेडेंशियल्स दर्ज करने होंगे। इसे 1 मिनट में सेट करें:
                      </p>

                      <ol className="list-decimal pl-4 text-[10px] space-y-1.5 text-slate-650 font-medium leading-relaxed mb-3">
                        <li>
                          सबसे पहले अपने Google Account की <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold">Security Settings</a> में जाएं और सुनिश्चित करें कि <strong>2-Step Verification</strong> चालू है।
                        </li>
                        <li>
                          गूगल सर्च बार में <strong className="text-indigo-700">"App Passwords"</strong> (या <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline underline font-bold">App Passwords Link</a>) सर्च करें।
                        </li>
                        <li>
                          एक नया नाम डालें (जैसे <code>Stream Hub</code>) और <strong>Create</strong> पर क्लिक करें। आपको एक <strong>16-characters का कोड</strong> प्राप्त होगा (जैसे: <code>abcd efgh ijkl mnop</code>)।
                        </li>
                        <li>
                          इस एनिग्रैविटी बिल्ड एनवायरनमेंट के <strong>Settings Panel (गियर आइकन/सीक्रेट्स लिस्ट)</strong> में जाएं और निम्नलिखित 4 वैरियेबल्स सेव करें:
                          <div className="bg-white/80 border border-indigo-100 rounded p-1.5 mt-1 font-mono text-[9px] text-slate-800 space-y-0.5">
                            <div>• <strong className="text-indigo-900">SMTP_HOST</strong> : <code>smtp.gmail.com</code></div>
                            <div>• <strong className="text-indigo-900">SMTP_PORT</strong> : <code>587</code></div>
                            <div>• <strong className="text-indigo-900">SMTP_USER</strong> : <code>अपना Gmail ID</code></div>
                            <div>• <strong className="text-indigo-900">SMTP_PASS</strong> : <code>16-अंकों का ऐप पासवर्ड (बिना स्पेस के)</code></div>
                          </div>
                        </li>
                      </ol>

                      <div className="text-[9px] text-slate-400 bg-white/50 border border-indigo-50/50 p-1.5 rounded leading-relaxed">
                        <strong>For English users:</strong> To route 100% active real codes to your inbox, set your Gmail App Password under secrets menu with the keys listed above (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="absolute top-4.5 right-4.5">
                <button
                  onClick={() => setShowWelcome(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-full transition text-xs cursor-pointer select-none font-bold"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER MASTER ADVENT SYSTEM ADMIN PANEL OVERLAY */}
      {showAdmin && (
        <AdminPanel 
          user={currentUser} 
          onClose={() => setShowAdmin(false)} 
          onRefreshCatalogAndConfigs={async () => {
            try {
              const [loadedSettings, loadedServices] = await Promise.all([
                settingsService.getSettings(),
                settingsService.getServices()
              ]);
              setAppSettings(loadedSettings);
              setServicesList(loadedServices);
            } catch (err) {
              console.warn("Could not reload custom catalogs on settings save:", err);
            }
          }}
        />
      )}
    </div>
  );
}
