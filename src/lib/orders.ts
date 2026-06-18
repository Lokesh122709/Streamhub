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
  /**
   * Registers a new order transaction in backend connected Firebase.
   */
  async createOrder(params: {
    userId: string;
    email: string;
    serviceId: string;
    serviceName: string;
    price: number;
    duration: string;
  }): Promise<string> {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create order transaction through backend.");
    }
    const data = await res.json();
    return data.orderId;
  },

  /**
   * Fetches user-specific orders via backend proxy API.
   */
  async fetchUserOrders(userId: string): Promise<Order[]> {
    try {
      const res = await fetch(`/api/orders?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Internal server returned: " + res.status);
      const data = await res.json();
      return (data || []).map((o: any) => ({
        ...o,
        createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date(),
      })).sort((a: Order, b: Order) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err) {
      console.warn("Could not retrieve user transactions via backend API, returning empty list:", err);
      return [];
    }
  },
  
  /**
   * Fetches all registered system orders. Perfect for separate/external Admin controllers.
   */
  async fetchAllOrders(): Promise<Order[]> {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Internal server returned: " + res.status);
      const data = await res.json();
      return (data || []).map((o: any) => ({
        ...o,
        createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date(),
      })).sort((a: Order, b: Order) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err) {
      console.warn("Could not retrieve system transactions via backend API, returning empty list:", err);
      return [];
    }
  },

  /**
   * Safe status update request.
   */
  async updateOrderStatus(orderId: string, status: 'pending' | 'active' | 'expired'): Promise<void> {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to alter status of order on backend.");
    }
  }
};
