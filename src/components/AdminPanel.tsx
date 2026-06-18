import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Settings, 
  Tv, 
  ClipboardList, 
  TrendingUp, 
  Check, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  ToggleLeft, 
  ToggleRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { authService, GoogleUser } from "../lib/firebase";
import { settingsService, AppSettings } from "../lib/settings";
import { ordersService, Order } from "../lib/orders";
import { OTTSubscription } from "../data/ottData";

interface AdminPanelProps {
  user: GoogleUser | null;
  onClose: () => void;
  onRefreshCatalogAndConfigs: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ user, onClose, onRefreshCatalogAndConfigs }) => {
  const [activeTab, setActiveTab] = useState<"configs" | "catalog" | "orders">("configs");
  
  // Checking admin status: lr4239469@gmail.com is our superadmin
  const isAdmin = user && user.email.toLowerCase() === "lr4239469@gmail.com";
  
  // Database States
  const [configs, setConfigs] = useState<AppSettings | null>(null);
  const [services, setServices] = useState<OTTSubscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Search State for Orders
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "pending" | "active" | "expired">("all");

  // Dynamic Product Form State
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({
    id: "",
    name: "",
    price: 99,
    duration: "1 Month",
    logoKey: "youtube",
    tagline: "",
    description: "",
    category: "entertainment" as "all" | "entertainment" | "music" | "productivity",
    benefitsText: "" // Comma-separated or line-separated benefits
  });

  // Config Form State
  const [configForm, setConfigForm] = useState<AppSettings>({
    whatsappNumber: "",
    qrCodeUrl: "",
    upiId: "",
    bannerText: "",
    showBanner: true
  });

  const loadAllAdminData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [loadedConfigs, loadedServices, loadedOrders] = await Promise.all([
        settingsService.getSettings(),
        settingsService.getServices(),
        ordersService.fetchAllOrders()
      ]);
      
      setConfigs(loadedConfigs);
      setConfigForm(loadedConfigs);
      setServices(loadedServices);
      setOrders(loadedOrders);
    } catch (err: any) {
      console.error("Admin data load error:", err);
      setActionError("Could not retrieve some data from Firestore. Check connection or project permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, [user]);

  // Handle Global App Settings Update
  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess(null);
    setActionError(null);
    try {
      await settingsService.updateSettings(configForm);
      showTemporarySuccess("Global configuration settings applied successfully!");
      onRefreshCatalogAndConfigs();
    } catch (err) {
      setActionError("Failed to update layout configurations.");
    }
  };

  // Trigger form editing for an existing service
  const handleEditService = (service: OTTSubscription) => {
    setEditingServiceId(service.id);
    setServiceForm({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      logoKey: service.logoKey,
      tagline: service.tagline,
      description: service.description,
      category: service.category as any,
      benefitsText: service.benefits.join("\n")
    });
  };

  // Reset Service Form to empty default values
  const handleResetServiceForm = () => {
    setEditingServiceId(null);
    setServiceForm({
      id: "",
      name: "",
      price: 149,
      duration: "1 Month",
      logoKey: "youtube",
      tagline: "",
      description: "",
      category: "entertainment",
      benefitsText: ""
    });
  };

  // Submit dynamic OTT service product details
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess(null);
    setActionError(null);
    
    // Quick validation
    if (!serviceForm.id || !serviceForm.name || !serviceForm.tagline || !serviceForm.description) {
      setActionError("Please resolve missing fields: ID, Name, Tagline, and Description are required.");
      return;
    }

    const cleanedBenefits = serviceForm.benefitsText
      .split("\n")
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const payload: OTTSubscription = {
      id: serviceForm.id.toLowerCase().replace(/\s+/g, "-"),
      name: serviceForm.name,
      price: Number(serviceForm.price),
      duration: serviceForm.duration,
      logoKey: serviceForm.logoKey,
      tagline: serviceForm.tagline,
      description: serviceForm.description,
      category: serviceForm.category === "all" ? "entertainment" : serviceForm.category,
      benefits: cleanedBenefits
    };

    try {
      await settingsService.saveService(payload);
      showTemporarySuccess(`OTT Service ${payload.name} saved and activated successfully!`);
      handleResetServiceForm();
      const updatedServices = await settingsService.getServices();
      setServices(updatedServices);
      onRefreshCatalogAndConfigs();
    } catch (err) {
      setActionError("Failed to write service details to Firebase.");
    }
  };

  // Uninstall specific service from catalog
  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm("Are you absolutely sure you want to completely delete this OTT service premium package? This cannot be undone.")) {
      return;
    }
    setActionSuccess(null);
    setActionError(null);
    try {
      await settingsService.deleteService(serviceId);
      showTemporarySuccess("OTT Premium Package removed successfully!");
      const updatedServices = await settingsService.getServices();
      setServices(updatedServices);
      onRefreshCatalogAndConfigs();
    } catch (err) {
      setActionError("Error removing service from Firestore.");
    }
  };

  // Real-time Order Status updates (Pending -> Active -> Expired)
  const handleChangeOrderStatus = async (orderId: string, status: "pending" | "active" | "expired") => {
    setActionSuccess(null);
    setActionError(null);
    try {
      await ordersService.updateOrderStatus(orderId, status);
      showTemporarySuccess(`Order ${orderId.substring(0, 8)} status successfully updated to: ${status.toUpperCase()}!`);
      // Update local state without hitting a full reload
      setOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? { ...o, status, updatedAt: new Date() } : o)
      );
    } catch (err) {
      setActionError("Failed to update status details in Firestore.");
    }
  };

  const showTemporarySuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => {
      setActionSuccess(null);
    }, 4500);
  };

  // Filters for client-side search inside order logs
  const filteredOrders = orders.filter(o => {
    const matchesQuery = o.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
                         o.email.toLowerCase().includes(orderSearch.toLowerCase()) || 
                         o.serviceName.toLowerCase().includes(orderSearch.toLowerCase());
    const matchesStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Modern Admin Header Banner */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-indigo-705 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-emerald-300">
              <Settings className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <h2 className="text-md font-bold tracking-wide font-sans flex items-center gap-2">
                Stream Hub - Admin Control Center
                <span className="text-[10px] font-mono bg-indigo-900 border border-indigo-700 text-indigo-200 px-2 py-0.5 rounded-full font-bold">
                  v2.5 Live
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">Authenticated: {user?.email || "Signed Out"}</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 px-4 bg-slate-800 hover:bg-slate-700 font-bold font-sans text-xs rounded-lg transition text-slate-300 border border-slate-700 cursor-pointer"
          >
            Exit Control Panel
          </button>
        </div>

        {/* Security Warning Lock overlay to unauthorized viewers */}
        {!isAdmin ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="bg-red-50 p-4 rounded-full text-red-500">
              <ShieldAlert className="w-12 h-12 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Security Clearance Required</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Access to write, modify, or update financial nodes, UPI identifiers, and Catalogue services requires authentic credentials as master administrator.
            </p>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs font-mono text-slate-600">
              Active Session Email: <span className="font-bold text-red-600">{user?.email || "Unknown User"}</span>
            </div>
            <button 
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Return Home
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Admin Toolbar and Navigation Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab("configs")}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                    activeTab === "configs" 
                      ? "bg-slate-900 text-white" 
                      : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Platform Config</span>
                </button>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                    activeTab === "catalog" 
                      ? "bg-slate-900 text-white" 
                      : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                  }`}
                >
                  <Tv className="w-4 h-4" />
                  <span>OTT catalog</span>
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition font-sans cursor-pointer relative ${
                    activeTab === "orders" 
                      ? "bg-slate-900 text-white" 
                      : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Verify Transactions</span>
                  {orders.filter(o => o.status === "pending").length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
                      {orders.filter(o => o.status === "pending").length}
                    </span>
                  )}
                </button>
              </div>

              {/* Status & Sync indicator */}
              <div className="flex items-center space-x-3 text-xs font-mono ml-auto">
                <button 
                  onClick={loadAllAdminData}
                  disabled={isLoading}
                  className="flex items-center space-x-1 p-1 text-[10px] text-indigo-600 bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer font-bold font-sans"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Sync DB</span>
                </button>
                <span className="text-slate-400">|</span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">CONNECTED</span>
                </span>
              </div>
            </div>

            {/* Event notification banners */}
            <AnimatePresence>
              {actionSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 shrink-0 font-sans"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-semibold">{actionSuccess}</span>
                </motion.div>
              )}
              {actionError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center space-x-2 shrink-0 font-sans"
                >
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="font-semibold">{actionError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dynamic Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 font-sans">
              
              {isLoading && (
                <div className="h-48 flex flex-col items-center justify-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">Synchronizing live parameters from Firebase...</p>
                </div>
              )}

              {!isLoading && (
                <>
                  {/* TAB 1: Platform Global Configs */}
                  {activeTab === "configs" && (
                    <div className="max-w-2xl mx-auto space-y-6">
                      <div className="bg-slate-50/50 p-5 border border-slate-200 rounded-xl">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1 flex items-center gap-2">
                          <Settings className="w-4 h-4 text-slate-600" />
                          Master Gateways & Notice configurations
                        </h3>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                          Update standard values used in custom checkouts. Applied settings save globally and configure all client purchases instantly without manually editing components.
                        </p>

                        <form onSubmit={handleSaveConfigs} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">UPI ID ADDRESS</label>
                              <input 
                                type="text"
                                value={configForm.upiId}
                                onChange={(e) => setConfigForm({ ...configForm, upiId: e.target.value })}
                                placeholder="name@upi-address"
                                className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs outline-none transition font-semibold"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">SUPPORT WHATSAPP NUMBER</label>
                              <input 
                                type="text"
                                value={configForm.whatsappNumber}
                                onChange={(e) => setConfigForm({ ...configForm, whatsappNumber: e.target.value })}
                                placeholder="e.g. 919024885265"
                                className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs outline-none transition font-semibold"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">UPI PAYMENT TARGET QR CODE IMAGE LINK</label>
                            <input 
                              type="url"
                              value={configForm.qrCodeUrl}
                              onChange={(e) => setConfigForm({ ...configForm, qrCodeUrl: e.target.value })}
                              placeholder="Direct image URL of QR code illustration"
                              className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs outline-none transition font-mono"
                              required
                            />
                            <p className="text-[10px] text-slate-400 mt-0.5">Note: Must be a direct absolute link (PNG, JPG) visible to internet boundaries.</p>
                          </div>

                          <div className="border-t border-slate-200/70 pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                SHOW ANNOUNCEMENT SCROLL NOTICE
                              </label>
                              <button
                                type="button"
                                onClick={() => setConfigForm({ ...configForm, showBanner: !configForm.showBanner })}
                                className="p-1 outline-none text-indigo-600 focus:ring-0 cursor-pointer"
                              >
                                {configForm.showBanner ? (
                                  <ToggleRight className="w-9 h-9 text-indigo-650" />
                                ) : (
                                  <ToggleLeft className="w-9 h-9 text-slate-400" />
                                )}
                              </button>
                            </div>
                            
                            {configForm.showBanner && (
                              <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1">SCROLL NOTICE BANNER CONTENT</label>
                                <textarea
                                  value={configForm.bannerText}
                                  onChange={(e) => setConfigForm({ ...configForm, bannerText: e.target.value })}
                                  placeholder="Type banner alert notification to highlight text on the home page."
                                  className="w-full p-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs outline-none transition min-h-[60px]"
                                />
                              </div>
                            )}
                          </div>

                          <div className="pt-4 border-t border-slate-200 flex justify-end">
                            <button
                              type="submit"
                              className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold transition hover:bg-slate-800 flex items-center space-x-1.5 cursor-pointer shadow-sm"
                            >
                              <Save className="w-4 h-4" />
                              <span>Apply Global Configurations</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Dynamic Subscription Catalogue */}
                  {activeTab === "catalog" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      
                      {/* Left: Product additions and configurations */}
                      <div className="lg:col-span-5 bg-slate-50/50 p-5 border border-slate-200 rounded-xl self-start">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-1">
                          {editingServiceId ? "Modify OTT Premium Deal" : "Introduce New OTT Package"}
                        </h3>
                        <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                          Add a product to direct Firestore boundaries. Clients instantly see, search, and click catalog cards upon activation.
                        </p>

                        <form onSubmit={handleSaveService} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">UNIQUE DEPLOY KEY ID</label>
                              <input 
                                type="text"
                                value={serviceForm.id}
                                onChange={(e) => setServiceForm({ ...serviceForm, id: e.target.value })}
                                placeholder="e.g. netflix-ultra"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none transition font-semibold"
                                disabled={!!editingServiceId}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">BRAND NAME (TITLE)</label>
                              <input 
                                type="text"
                                value={serviceForm.name}
                                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                                placeholder="e.g. Netflix Ultra 4K"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none transition font-semibold"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">PRICE IN INR (₹)</label>
                              <input 
                                type="number"
                                value={serviceForm.price}
                                onChange={(e) => setServiceForm({ ...serviceForm, price: Math.max(0, Number(e.target.value)) })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none transition font-bold"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">VALIDITY TIMEFRAME</label>
                              <input 
                                type="text"
                                value={serviceForm.duration}
                                onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                                placeholder="e.g. 1 Month, 1 Year"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs tracking-wide outline-none transition"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1 font-sans">CATEGORY TYPE</label>
                              <select
                                value={serviceForm.category}
                                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value as any })}
                                className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                              >
                                <option value="entertainment">Entertainment</option>
                                <option value="music">Music</option>
                                <option value="productivity">Productivity</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1 font-sans">BRAND LOGO ICON</label>
                              <select
                                value={serviceForm.logoKey}
                                onChange={(e) => setServiceForm({ ...serviceForm, logoKey: e.target.value })}
                                className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                              >
                                <option value="youtube">YouTube (Red Theme)</option>
                                <option value="netflix">Netflix (Crimson Gloss Theme)</option>
                                <option value="spotify">Spotify (Emerald Green Theme)</option>
                                <option value="jio_hotstar">Hotstar Starlet Gradient</option>
                                <option value="amazon_prime">Amazon Prime Deep Sea Blue</option>
                                <option value="sony_liv">Sony LIV Premium (Live Sports Theme)</option>
                                <option value="crunchyroll">Crunchyroll (Ad-Free Anime)</option>
                                <option value="apple_music">Apple Music (Gloss Rose Gradient)</option>
                                <option value="gaana_plus">Gaana Plus Red theme</option>
                                <option value="canva_pro">Canva Pro Creator</option>
                                <option value="chatgpt">ChatGPT Plus AI</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">BRAND TAGLINE</label>
                            <input 
                              type="text"
                              value={serviceForm.tagline}
                              onChange={(e) => setServiceForm({ ...serviceForm, tagline: e.target.value })}
                              placeholder="Brief highlights description line"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none transition"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">FULL SERVICE DESCRIPTION</label>
                            <textarea 
                              value={serviceForm.description}
                              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                              placeholder="Full description paragraph explaining accounts access parameters"
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs min-h-[60px] outline-none transition"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              PERKS & BENEFITS (One Benefit per line)
                            </label>
                            <textarea 
                              value={serviceForm.benefitsText}
                              onChange={(e) => setServiceForm({ ...serviceForm, benefitsText: e.target.value })}
                              placeholder="Ad-free extreme quality streaming&#10;Access on 4 screens simultaneous&#10;Ultra audio surround modes"
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs min-h-[80px] outline-none font-mono"
                            />
                          </div>

                          <div className="flex space-x-2 pt-2">
                            <button
                              type="submit"
                              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition text-center cursor-pointer shadow-sm"
                            >
                              {editingServiceId ? "Apply Modifications" : "Launch Premium Product"}
                            </button>
                            {editingServiceId && (
                              <button
                                type="button"
                                onClick={handleResetServiceForm}
                                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </form>
                      </div>

                      {/* Right: Existing Services Catalog */}
                      <div className="lg:col-span-7 flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                            <Tv className="w-4 h-4 text-slate-600" />
                            Active Listing Items ({services.length})
                          </h4>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="max-h-[500px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left">
                              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                <tr>
                                  <th className="px-4 py-3">Product Name</th>
                                  <th className="px-4 py-3">Type</th>
                                  <th className="px-4 py-3">Rate</th>
                                  <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-600 text-xs">
                                {services.map((plan) => (
                                  <tr key={plan.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-3.5">
                                      <div className="font-bold text-slate-900 leading-tight">{plan.name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">id: {plan.id}</div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        {plan.category}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <span className="font-bold text-slate-900">₹{plan.price}</span>
                                      <span className="text-slate-400 text-[10px]"> / {plan.duration}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right space-x-1.5">
                                      <button
                                        onClick={() => handleEditService(plan)}
                                        className="p-1 px-2.5 text-[10px] rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold cursor-pointer select-none inline-flex items-center gap-1"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteService(plan.id)}
                                        className="p-1 px-2.5 text-[10px] rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 font-bold cursor-pointer select-none inline-flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Del</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {services.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400">
                                      No services registered. Add a package on the left dynamically.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 3: Transactions and Order verification */}
                  {activeTab === "orders" && (
                    <div className="space-y-4">
                      
                      {/* Search Bar / Filter Toolbar */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:max-w-md">
                          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Find target Order ID, customer email, or service..."
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                            className="w-full bg-white pl-9 pr-4 py-2 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none transition"
                          />
                        </div>

                        {/* Status Filter buttons */}
                        <div className="flex flex-wrap items-center gap-1 ml-auto">
                          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Status:</span>
                          {(["all", "pending", "active", "expired"] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => setOrderStatusFilter(status)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border cursor-pointer transition select-none ${
                                orderStatusFilter === status
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {status === "all" ? "SHOW ALL" : status}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Orders Database list */}
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="max-h-[500px] overflow-y-auto">
                          <table className="min-w-full divide-y divide-slate-200 text-left">
                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              <tr>
                                <th className="px-4 py-3">Order Code</th>
                                <th className="px-4 py-3">Customer User</th>
                                <th className="px-4 py-3">Plan Details</th>
                                <th className="px-4 py-3">Submission Date</th>
                                <th className="px-4 py-3">Verification State</th>
                                <th className="px-4 py-3 text-right">Approval Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600 text-xs">
                              {filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition">
                                  
                                  {/* Order ID */}
                                  <td className="px-4 py-4.5 font-mono">
                                    <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                                      #{order.id.substring(0, 10)}
                                    </div>
                                    <div className="text-[9px] text-slate-400">{order.id}</div>
                                  </td>

                                  {/* Customer Email */}
                                  <td className="px-4 py-4.5">
                                    <div className="font-semibold text-slate-800 flex items-center space-x-1">
                                      <span>{order.email}</span>
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-mono">UID: {order.userId.substring(0, 8)}...</div>
                                  </td>

                                  {/* Plan & price details */}
                                  <td className="px-4 py-4.5">
                                    <div className="font-bold text-slate-930 text-xs">
                                      {order.serviceName}
                                    </div>
                                    <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-mono">
                                      ₹{order.price}
                                    </span>
                                    <span className="text-slate-400 font-mono text-[10px] ml-1">({order.duration})</span>
                                  </td>

                                  {/* Created Date */}
                                  <td className="px-4 py-4.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                                    {order.createdAt ? order.createdAt.toLocaleString() : "Real-time"}
                                  </td>

                                  {/* Current Status Badge */}
                                  <td className="px-4 py-4.5 whitespace-nowrap">
                                    {order.status === "pending" && (
                                      <span className="inline-flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-full">
                                        <Clock className="w-3 h-3 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
                                        <span>Pending Approval</span>
                                      </span>
                                    )}
                                    {order.status === "active" && (
                                      <span className="inline-flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-250 text-emerald-800 px-2 py-1 rounded-full">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span>Activated</span>
                                      </span>
                                    )}
                                    {order.status === "expired" && (
                                      <span className="inline-flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-500 px-2 py-1 rounded-full">
                                        <XCircle className="w-3 h-3 text-slate-400" />
                                        <span>Expired / Denied</span>
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td className="px-4 py-4.5 text-right whitespace-nowrap space-x-1">
                                    
                                    {/* Activate Button */}
                                    <button
                                      disabled={order.status === "active"}
                                      onClick={() => handleChangeOrderStatus(order.id, "active")}
                                      className={`p-1 px-2.5 text-[10px] font-bold rounded cursor-pointer uppercase tracking-wider transition ${
                                        order.status === "active"
                                          ? "bg-slate-100 border border-slate-200 text-slate-350"
                                          : "bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600"
                                      }`}
                                    >
                                      ACTIVATE
                                    </button>

                                    {/* Deny / Expire button */}
                                    <button
                                      disabled={order.status === "expired"}
                                      onClick={() => handleChangeOrderStatus(order.id, "expired")}
                                      className={`p-1 px-2.5 text-[10px] font-bold rounded cursor-pointer uppercase tracking-wider transition ${
                                        order.status === "expired"
                                          ? "bg-slate-100 border border-slate-200 text-slate-350"
                                          : "bg-white hover:bg-red-50 text-red-600 border border-slate-200"
                                      }`}
                                    >
                                      EXPIRE / REJECT
                                    </button>

                                    {/* External Contact Help */}
                                    <a
                                      target="_blank"
                                      referrerPolicy="no-referrer"
                                      href={`https://wa.me/${configs?.whatsappNumber || "919024885265"}?text=${encodeURIComponent(
                                        `Hello customer,\n\nWe are reviewing your Order: #${order.id.substring(0, 8)}\nClient Email: ${order.email}\nOTT Plan: ${order.serviceName}\nCost: ₹${order.price}\n\nCould you please share your payment confirmation screenshot if you have not done so already? Thank you!`
                                      )}`}
                                      className="p-1 px-2 text-[10px] font-sans font-semibold rounded bg-white hover:bg-slate-100 border border-slate-200 text-indigo-600 inline-flex items-center gap-0.5 select-none"
                                    >
                                      <span>WA</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>

                                  </td>

                                </tr>
                              ))}
                              {filteredOrders.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="p-12 text-center text-slate-400">
                                    No customer transaction logs match the active query.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}
                </>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
