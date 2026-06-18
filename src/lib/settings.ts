import { doc, getDoc, getDocs, collection, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
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
   * Fetches site-wide settings from settings/config block. Fallback to hardcoded defaults on error or empty.
   */
  async getSettings(): Promise<AppSettings> {
    if (!db) {
      return DEFAULT_SETTINGS;
    }
    try {
      const docRef = doc(db, "settings", "config");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          whatsappNumber: data.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
          qrCodeUrl: data.qrCodeUrl || DEFAULT_SETTINGS.qrCodeUrl,
          upiId: data.upiId || DEFAULT_SETTINGS.upiId,
          bannerText: data.bannerText || DEFAULT_SETTINGS.bannerText,
          showBanner: data.showBanner !== undefined ? data.showBanner : DEFAULT_SETTINGS.showBanner,
        };
      } else {
        // Automatically bootstrap settings on first launch so the admin panel has a record to update!
        try {
          await setDoc(docRef, {
            ...DEFAULT_SETTINGS,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (setErr) {
          console.warn("Could not auto-bootstrap default settings (non-critical):", setErr);
        }
        return DEFAULT_SETTINGS;
      }
    } catch (err) {
      console.warn("Failed to fetch settings, using local hardcoded fallbacks:", err);
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * Fetches all registered subscription services from Firebase Firestore.
   * Merges or falls back to standard catalog (OTT_SUBSCRIBERS) if Firestore is empty/unconfigured.
   */
  async getServices(): Promise<OTTSubscription[]> {
    if (!db) {
      return OTT_SUBSCRIBERS;
    }
    try {
      const colRef = collection(db, "services");
      const querySnap = await getDocs(colRef);
      if (querySnap.empty) {
        // Optional: Auto-populate the catalog in Firestore so the admin panel instantly sees them
        console.log("No services collection found. Bootstrapping initial OTT catalog from local memory...");
        for (const plan of OTT_SUBSCRIBERS) {
          try {
            await setDoc(doc(db, "services", plan.id), {
              ...plan,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (writeErr) {
            console.warn(`Bootstrapping premium plan ${plan.id} failed:`, writeErr);
          }
        }
        return OTT_SUBSCRIBERS;
      }

      const list: OTTSubscription[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || "",
          price: Number(data.price) || 0,
          duration: data.duration || "",
          logoKey: data.logoKey || "youtube",
          benefits: Array.isArray(data.benefits) ? data.benefits : [],
          description: data.description || "",
          category: data.category || "entertainment",
          tagline: data.tagline || "",
        });
      });
      return list;
    } catch (err) {
      console.warn("Failed to retrieve custom services, falling back to local list:", err);
      return OTT_SUBSCRIBERS;
    }
  },

  /**
   * Updates global platform configuration like WhatsApp line, Official UPI ID, and status notices.
   */
  async updateSettings(settings: AppSettings): Promise<void> {
    if (!db) {
      throw new Error("Firestore is not initialized.");
    }
    try {
      const docRef = doc(db, "settings", "config");
      await setDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to update site configuration settings:", err);
      throw err;
    }
  },

  /**
   * Overwrites or creates a premium subscription service record inside "services" collection.
   */
  async saveService(service: OTTSubscription): Promise<void> {
    if (!db) {
      throw new Error("Firestore is not initialized.");
    }
    try {
      const docRef = doc(db, "services", service.id);
      await setDoc(docRef, {
        ...service,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error(`Failed to save service document ${service.id}:`, err);
      throw err;
    }
  },

  /**
   * Uninstalls a dynamic premium service plan immediately.
   */
  async deleteService(serviceId: string): Promise<void> {
    if (!db) {
      throw new Error("Firestore is not initialized.");
    }
    try {
      const docRef = doc(db, "services", serviceId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error(`Failed to delete service document ${serviceId}:`, err);
      throw err;
    }
  }
};
