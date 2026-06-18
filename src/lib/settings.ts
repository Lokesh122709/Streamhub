import { OTTSubscription, OTT_SUBSCRIBERS } from "../data/ottData";

export interface AppSettings {
  whatsappNumber: string;
  qrCodeUrl: string;
  upiId: string;
  bannerText: string;
  showBanner: boolean;
  updatedAt?: any;
}

const DEFAULT_SETTINGS: AppSettings = {
  whatsappNumber: "919024885265",
  qrCodeUrl: "https://cdn.imageurlgenerator.com/uploads/b078839e-9a1c-45ee-9438-b4e5da61c61a.jpg",
  upiId: "lr4239469@okaxis",
  bannerText: "🎉 Special Discount: Share your payment screenshot on WhatsApp for instant 5-minute activation!",
  showBanner: true,
};

export const settingsService = {
  /**
   * Fetches site-wide settings from secure Express backend. Fallback to hardcoded defaults on error or empty.
   */
  async getSettings(): Promise<AppSettings> {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Backend answered with status: " + res.status);
      const data = await res.json();
      return {
        whatsappNumber: data.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
        qrCodeUrl: data.qrCodeUrl || DEFAULT_SETTINGS.qrCodeUrl,
        upiId: data.upiId || DEFAULT_SETTINGS.upiId,
        bannerText: data.bannerText || DEFAULT_SETTINGS.bannerText,
        showBanner: data.showBanner !== undefined ? data.showBanner : DEFAULT_SETTINGS.showBanner,
      };
    } catch (err) {
      console.warn("Failed to fetch settings through backend API proxies, using local defaults:", err);
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * Fetches all registered subscription services from secure Express backend.
   * Merges or falls back to standard catalog if empty.
   */
  async getServices(): Promise<OTTSubscription[]> {
    try {
      const res = await fetch("/api/services");
      if (!res.ok) throw new Error("Backend answered with status: " + res.status);
      const list = await res.json();
      
      if (!list || list.length === 0) {
        console.log("No services returned by backend, bootstrapping local OTT catalog...");
        // Bootstrap services via API calls so future backend gets populated
        for (const plan of OTT_SUBSCRIBERS) {
          try {
            await this.saveService(plan);
          } catch (pErr) {
            console.warn("Failed backfilled auto sync:", pErr);
          }
        }
        return OTT_SUBSCRIBERS;
      }
      return list;
    } catch (err) {
      console.warn("Failed to retrieve custom services via backend proxies, falling back to local list:", err);
      return OTT_SUBSCRIBERS;
    }
  },

  /**
   * Updates global platform configuration.
   */
  async updateSettings(settings: AppSettings): Promise<void> {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update global configurations on backend.");
    }
  },

  /**
   * Overwrites or creates a premium subscription service record.
   */
  async saveService(service: OTTSubscription): Promise<void> {
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(service),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update dynamic service catalog on backend.");
    }
  },

  /**
   * Uninstalls a dynamic premium service plan.
   */
  async deleteService(serviceId: string): Promise<void> {
    const res = await fetch(`/api/services/${encodeURIComponent(serviceId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to delete service catalog from backend");
    }
  }
};
