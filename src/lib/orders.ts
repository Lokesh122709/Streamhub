import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";

export interface Order {
  id: string;
  userId: string;
  email: string;
  serviceId: string;
  serviceName: string;
  price: number;
  duration: string;
  status: 'pending' | 'active' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

export const ordersService = {
  async createOrder(params: {
    userId: string;
    email: string;
    serviceId: string;
    serviceName: string;
    price: number;
    duration: string;
  }): Promise<string> {
    if (!db) {
      throw new Error("Firestore database is not initialized.");
    }
    const ordersCol = collection(db, "orders");
    const newDocRef = doc(ordersCol); // Auto-generate an ID
    const orderId = newDocRef.id;

    const payload = {
      id: orderId,
      userId: params.userId,
      email: params.email,
      serviceId: params.serviceId,
      serviceName: params.serviceName,
      price: params.price,
      duration: params.duration,
      status: "pending" as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const path = `orders/${orderId}`;
    try {
      await setDoc(newDocRef, payload);
      return orderId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async fetchUserOrders(userId: string): Promise<Order[]> {
    if (!db) {
      return [];
    }
    const ordersCol = collection(db, "orders");
    const q = query(
      ordersCol,
      where("userId", "==", userId)
    );

    const path = "orders";
    try {
      const snap = await getDocs(q);
      const list: Order[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        let createdDate = new Date();
        let updatedDate = new Date();

        if (data.createdAt) {
          if (typeof data.createdAt.toDate === "function") {
            createdDate = data.createdAt.toDate();
          } else if (data.createdAt.seconds) {
            createdDate = new Date(data.createdAt.seconds * 1000);
          } else {
            createdDate = new Date(data.createdAt);
          }
        }

        if (data.updatedAt) {
          if (typeof data.updatedAt.toDate === "function") {
            updatedDate = data.updatedAt.toDate();
          } else if (data.updatedAt.seconds) {
            updatedDate = new Date(data.updatedAt.seconds * 1000);
          } else {
            updatedDate = new Date(data.updatedAt);
          }
        }

        list.push({
          id: docSnap.id,
          userId: data.userId || "",
          email: data.email || "",
          serviceId: data.serviceId || "",
          serviceName: data.serviceName || "",
          price: data.price || 0,
          duration: data.duration || "",
          status: data.status || "pending",
          createdAt: createdDate,
          updatedAt: updatedDate,
        });
      });
      // Sort client-side to show most recent first, preventing the need for composite indexes
      return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      throw error;
    }
  },
  
  async fetchAllOrders(): Promise<Order[]> {
    if (!db) {
      return [];
    }
    const ordersCol = collection(db, "orders");
    const path = "orders";
    try {
      const snap = await getDocs(ordersCol);
      const list: Order[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        let createdDate = new Date();
        let updatedDate = new Date();

        if (data.createdAt) {
          if (typeof data.createdAt.toDate === "function") {
            createdDate = data.createdAt.toDate();
          } else if (data.createdAt.seconds) {
            createdDate = new Date(data.createdAt.seconds * 1000);
          } else {
            createdDate = new Date(data.createdAt);
          }
        }

        if (data.updatedAt) {
          if (typeof data.updatedAt.toDate === "function") {
            updatedDate = data.updatedAt.toDate();
          } else if (data.updatedAt.seconds) {
            updatedDate = new Date(data.updatedAt.seconds * 1000);
          } else {
            updatedDate = new Date(data.updatedAt);
          }
        }

        list.push({
          id: docSnap.id,
          userId: data.userId || "",
          email: data.email || "",
          serviceId: data.serviceId || "",
          serviceName: data.serviceName || "",
          price: data.price || 0,
          duration: data.duration || "",
          status: data.status || "pending",
          createdAt: createdDate,
          updatedAt: updatedDate,
        });
      });
      return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      throw error;
    }
  },

  async updateOrderStatus(orderId: string, status: 'pending' | 'active' | 'expired'): Promise<void> {
    if (!db) {
      throw new Error("Firestore database is not initialized.");
    }
    const orderDocRef = doc(db, "orders", orderId);
    const path = `orders/${orderId}`;
    try {
      await setDoc(orderDocRef, {
        status,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }
};
