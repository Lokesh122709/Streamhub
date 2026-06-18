import React, { useEffect, useState } from "react";
import { GoogleUser } from "../lib/firebase";
import { Order, ordersService } from "../lib/orders";
import { getLogo } from "../data/ottData";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  MessageSquare, 
  Package, 
  Calendar,
  ExternalLink 
} from "lucide-react";

import { AppSettings } from "../lib/settings";

interface MyOrdersProps {
  user: GoogleUser | null;
  onBack: () => void;
  settings?: AppSettings | null;
}

export const MyOrders: React.FC<MyOrdersProps> = ({ user, onBack, settings }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.uid) {
      setIsLoading(true);
      ordersService.fetchUserOrders(user.uid)
        .then((data) => {
          setOrders(data);
        })
        .catch((err) => {
          console.error("Failed to retrieve user orders:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const getWhatsAppSupportLink = (order: Order) => {
    const whatsappNumber = settings?.whatsappNumber || "919024885265";
    const customMessage = `Hello Stream Hub Support!\n\nI need some help or validation regarding my order:\n⭐ Order ID: ${order.id}\n⭐ Service: ${order.serviceName}\n⭐ Amount: ₹${order.price}\n⭐ Account Email: ${order.email}\n⭐ Status: ${order.status.toUpperCase()}\n\nPlease guide me on the delivery or state of my order. Thank you!`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(customMessage)}`;
  };

  const formatDate = (date: Date) => {
    try {
      return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return date.toDateString();
    }
  };

  return (
    <div className="relative z-10 p-4 max-w-3xl mx-auto py-10">
      {/* Background soft ambient lighting */}
      <div className="netbond-glow-bg top-20 right-10 opacity-5"></div>

      {/* Back button */}
      <div className="flex items-center justify-between mb-8">
        <button
          id="back-to-catalog-btn"
          onClick={onBack}
          className="flex items-center space-x-2 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 bg-white p-2 px-4 rounded-xl hover:border-slate-300 transition cursor-pointer font-bold shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
          <span>Back to Catalog</span>
        </button>

        <div className="text-[10px] font-mono tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 p-1.5 px-3 rounded-full font-bold">
          ACCOUNT PURCHASES
        </div>
      </div>

      <div className="mb-6">
        <h1 className="font-display font-black text-2xl text-slate-800 tracking-tight">
          My Past Orders
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Review all your purchased premium credentials, active streams, and validation schedules securely stored under your account.
        </p>
      </div>

      {isLoading ? (
        <div className="border border-slate-200 bg-white p-12 rounded-3xl text-center shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-xs font-semibold">
            Fetching secure transaction logs from stream hub...
          </p>
        </div>
      ) : orders.length === 0 ? (
        <div className="border border-slate-150 bg-white p-12 rounded-3xl text-center shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-14 h-14 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">
            No Orders Placed Yet
          </h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mb-6">
            You haven't initiated or purchased any premium OTT subscription package on the Stream Hub catalog yet.
          </p>
          <button
            onClick={onBack}
            className="p-3 px-6 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer shadow-md shadow-indigo-150"
          >
            Browse Premium Catalogs
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const logoUrl = getLogo(order.serviceId);
            return (
              <div 
                key={order.id}
                className="border border-slate-200 bg-white rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition relative overflow-hidden"
              >
                {/* Visual Accent Corner Ribbon / Glow */}
                <div className="absolute top-0 right-0 h-1.5 w-16 bg-gradient-to-r from-indigo-500 to-blue-500"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  
                  {/* Service Logo & Plan Details */}
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl p-1.5 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt={order.serviceName} 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-sm text-slate-800">
                        {order.serviceName}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Plan Duration: {order.duration || "1 Month"}
                      </p>
                      <div className="mt-1 flex items-center space-x-1.5 text-xs text-slate-600">
                        <span className="font-bold text-slate-800">₹{order.price}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-[10px] bg-slate-100 p-0.5 px-2 rounded-md font-mono text-slate-500 uppercase tracking-wider font-bold">
                          1 DEVICE / SLOT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator Badge */}
                  <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
                    {order.status === "pending" ? (
                      <div className="flex items-center space-x-1.5 p-1 px-3 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-[10px] font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        <span>VERIFICATION PENDING</span>
                      </div>
                    ) : order.status === "active" ? (
                      <div className="flex items-center space-x-1.5 p-1 px-3 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-[10px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ACTIVE & VERIFIED</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 p-1 px-3 bg-slate-100 border border-slate-200 rounded-full text-slate-600 text-[10px] font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>EXPIRED</span>
                      </div>
                    )}
                    
                    <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(order.createdAt)}</span>
                    </span>
                  </div>

                </div>

                {/* Bottom Order Details: Transaction log ID & support link */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl">
                  
                  {/* Copyable Order log Ref ID */}
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-slate-400">Order Ref ID:</span>
                    <span className="font-mono text-[10px] text-slate-600 select-all font-bold tracking-wider">
                      {order.id}
                    </span>
                    <button
                      onClick={() => handleCopy(order.id)}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition cursor-pointer"
                      title="Copy Reference ID"
                    >
                      {copiedId === order.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {copiedId === order.id && (
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest font-mono">
                        COPIED
                      </span>
                    )}
                  </div>

                  {/* Actions / Buttons */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {order.status === "pending" && (
                      <span className="text-[9px] text-amber-600 font-bold max-w-[200px] text-left sm:text-right hidden sm:block">
                        Please send screenshot on WhatsApp!
                      </span>
                    )}
                    <a
                      href={getWhatsAppSupportLink(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 p-1.5 px-3 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-600 hover:text-indigo-600 hover:border-slate-300 font-bold transition cursor-pointer shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Support Chat</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                    </a>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
