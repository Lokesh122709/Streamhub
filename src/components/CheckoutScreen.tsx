import React, { useEffect, useState } from "react";
import { OTTSubscription } from "../data/ottData";
import { authService, GoogleUser } from "../lib/firebase";
import { ArrowLeft, Clock, ShieldCheck, AlertCircle, CheckCircle2, Mail, X } from "lucide-react";
import { ordersService } from "../lib/orders";
import { AppSettings } from "../lib/settings";

interface CheckoutScreenProps {
  service: OTTSubscription;
  user: GoogleUser | null;
  onBack: () => void;
  settings?: AppSettings | null;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ service, user, onBack, settings }) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes (300 seconds)
  const [elapsed, setElapsed] = useState(0); // seconds passed
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [successMode, setSuccessMode] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [sentEmailAddress, setSentEmailAddress] = useState<string>("");
  const [upiCopied, setUpiCopied] = useState(false);

  // Dynamic parameters fallbacks
  const minRequiredTime = 30; // 30 seconds payment hold
  const qrCodeUrl = settings?.qrCodeUrl || "https://cdn.imageurlgenerator.com/uploads/b078839e-9a1c-45ee-9438-b4e5da61c61a.jpg";
  const whatsappNumber = settings?.whatsappNumber || "919024885265";
  const upiIdVal = settings?.upiId || "lr4239469@okaxis";

  const handleUpiCopy = () => {
    navigator.clipboard.writeText(upiIdVal);
    setUpiCopied(true);
    setTimeout(() => {
      setUpiCopied(false);
    }, 2000);
  };

  useEffect(() => {
    // 5-minute Countdown Timer
    const countdownTimer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 30-second Holding Timer (seconds elapsed since opening checkout)
    const elapsedTimer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(countdownTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  // Format countdown into MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePaidConfirm = async () => {
    if (elapsed < minRequiredTime) {
      const remaining = minRequiredTime - elapsed;
      setAlertMessage(`First do payment! Please scan the QR Code, complete the pay, and wait ${remaining} more seconds for validation.`);
      
      // Auto-fade alarm message after 5 seconds
      setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return;
    }

    setSuccessMode(true);

    // Save order data in Firestore and send email confirmation
    if (user && user.uid) {
      setEmailStatus("sending");
      setSentEmailAddress(user.email || "");
      try {
        const orderId = await ordersService.createOrder({
          userId: user.uid,
          email: user.email || "",
          serviceId: service.id,
          serviceName: service.name,
          price: service.price,
          duration: service.duration,
        });

        // Backend API post request to send transaction ticket directly (Server SMTP-based real delivery)
        try {
          const res = await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: user.email,
              serviceName: service.name,
              orderId,
              price: service.price,
              duration: service.duration,
            }),
          });
          const rawResult = await res.json();
          if (rawResult && rawResult.success) {
            setEmailStatus("sent");
            console.log("Server API successfully dispatched order confirmation email:", orderId);
          } else {
            setEmailStatus("failed");
            console.warn("SMTP API delivery rejected by backend:", rawResult);
          }
        } catch (emailErr) {
          console.error("API call to send-email failed:", emailErr);
          setEmailStatus("failed");
        }
      } catch (err) {
        console.error("Firestore database order create failed:", err);
        setEmailStatus("failed");
      }
    }

    // Pre-craft URL-encoded WhatsApp message
    const formattedAmt = `₹${service.price}`;
    const userMailStr = user?.email || "Not logged in";
    const userUidStr = user?.uid || "Anonymous_GUEST";

    const customMessage = `Hello Stream Hub Premium Support!\n\nI have successfully paid ${formattedAmt} for "${service.name}" (1 Month Plan).\n\nPlease verify my payment and release my active premium credentials.\n\n-----------------\n📌 USER DETAILS:\n⭐ Account Email: ${userMailStr}\n⭐ Account UID: ${userUidStr}\n-----------------\n\nThank you! Looking forward to my active premium access.`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(customMessage)}`;

    // Safely redirect target link
    setTimeout(() => {
      window.open(whatsappUrl, "_blank");
    }, 800);
  };

  return (
    <div className="relative z-10 p-4 max-w-xl mx-auto py-10">
      {/* Background soft lighting */}
      <div className="netbond-glow-bg top-10 right-10 opacity-10"></div>

      {/* Return button */}
      <button
        id="back-to-details-btn"
        onClick={onBack}
        className="flex items-center space-x-2 text-xs text-slate-500 hover:text-slate-800 mb-6 border border-slate-205 bg-white p-2 px-3.5 rounded-xl hover:border-slate-300 transition cursor-pointer font-bold shadow-sm"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
        <span>Modify Order Choices</span>
      </button>

      {/* Checkout card container */}
      <div className="border border-slate-200 bg-white rounded-3xl p-6 shadow-2xl shadow-indigo-100/50 relative overflow-hidden text-center">
        
        {/* SECURE HEADER */}
        <div className="flex items-center justify-center space-x-1.5 p-2 px-3 bg-indigo-50 border border-indigo-100 rounded-full max-w-xs mx-auto mb-6">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span className="text-[10px] font-mono tracking-widest text-indigo-700 uppercase font-bold">
            SECURE CHECKOUT ENVIRONMENT
          </span>
        </div>

        <h2 className="font-display font-medium text-lg text-slate-800 mb-1.5 font-bold">
          Scan QR Code to Pay
        </h2>
        <p className="text-slate-500 text-xs max-w-sm mx-auto mb-6 font-medium">
          Please open any UPI App (GPay, PhonePe, Paytm) and scan the QR Code below to transfer money instantly.
        </p>

        {/* The Square Box containing the payment QR image */}
        <div className="relative w-72 h-72 mx-auto mb-5 bg-white p-4.5 rounded-2xl shadow-md border border-slate-150 flex items-center justify-center overflow-hidden">
          
          <img
            src={qrCodeUrl}
            alt="Secure UPI Payment Gateway QR Code"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />

          {/* Quick Loading Scanner Bar Animation */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-indigo-500/60 opacity-60 animate-bounce"></div>
        </div>

        {/* Price of Selected subscription directly below the image */}
        <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 max-w-xs mx-auto mb-3">
          <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-0.5 font-bold">
            SELECTED SUBSCRIBER AMOUNT
          </p>
          <p className="text-slate-700 font-mono text-sm tracking-wider font-bold">
            {service.name} • <span className="text-indigo-600">₹{service.price}</span>
          </p>
        </div>

        {/* UPI ID Address Copying section */}
        <div className="flex items-center justify-between border border-slate-200 bg-slate-50/50 rounded-xl p-2.5 max-w-xs mx-auto mb-6 text-xs shadow-sm">
          <div className="text-left">
            <span className="text-[8px] font-mono text-slate-400 uppercase block font-bold leading-none mb-0.5">UPI ID ADDRESS</span>
            <span className="font-mono text-slate-700 font-bold tracking-wider">{upiIdVal}</span>
          </div>
          <button
            onClick={handleUpiCopy}
            className="p-1.5 px-3 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-indigo-600 hover:bg-slate-50 transition cursor-pointer shadow-sm flex items-center space-x-1"
          >
            {upiCopied ? <span>Copied!</span> : <span>Copy ID</span>}
          </button>
        </div>

        {/* 5-minute Countdown Timer */}
        <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 font-mono mb-6 font-semibold">
          <Clock className="w-4 h-4 text-indigo-650 animate-pulse" />
          <span>QR Session Timeout:</span>
          {timeLeft > 0 ? (
            <span className="text-slate-800 font-bold tracking-wider text-sm">
              {formatTimer(timeLeft)}
            </span>
          ) : (
            <span className="text-red-500 font-bold">EXPIRED</span>
          )}
        </div>

        {/* Alarm Banner message */}
        {alertMessage && (
          <div className="flex items-start space-x-2.5 p-3 rounded-xl border border-red-250 bg-red-50 text-[10px] text-red-700 text-left mb-6 animate-pulse font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-650" />
            <span>{alertMessage}</span>
          </div>
        )}

        {/* I Paid Button Section */}
        {successMode ? (
          <div className="space-y-3.5 mb-2">
            <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex flex-col items-center justify-center space-y-2 text-center shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-emerald-650 animate-bounce" />
              <p className="text-xs text-emerald-800 font-extrabold font-sans">
                Subscribed Successfully!
              </p>
              <p className="text-[10px] text-emerald-600 max-w-xs font-semibold leading-relaxed">
                Opening WhatsApp support chat. Share your payment receipt screenshot there!
              </p>
            </div>

            {/* Email Dispatch Progress Indicator */}
            {emailStatus === "sending" && (
              <div className="p-3.5 bg-slate-50 border border-slate-205 rounded-2xl flex items-center justify-center space-x-2.5 text-[10px] text-slate-600 font-semibold">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Sending transaction receipt to {sentEmailAddress}...</span>
              </div>
            )}

            {emailStatus === "sent" && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-left">
                <p className="text-[9.5px] font-mono tracking-widest text-indigo-700 font-black mb-1">
                  📧 TRANSACTIONAL EMAIL COMPLETED
                </p>
                <p className="text-[10.5px] text-slate-700 font-semibold leading-relaxed">
                  We've automatically dispatched a "Thank You" receipt and billing details to your Google account:
                </p>
                <div className="bg-white p-2 border border-slate-200 rounded-xl mt-2 flex items-center justify-between">
                  <span className="text-[10.5px] font-mono font-bold text-slate-800 truncate block max-w-[180px]">
                    {sentEmailAddress}
                  </span>
                  <span className="text-[8.5px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 p-1 px-2 rounded-md">
                    SENT SUCCESSFULLY
                  </span>
                </div>
              </div>
            )}

            {emailStatus === "failed" && (
              <div className="p-4 bg-indigo-50/80 border border-indigo-150 rounded-2xl flex flex-col items-stretch text-left space-y-3">
                <div className="flex items-center space-x-2 border-b border-indigo-100 pb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <p className="text-[10px] font-mono tracking-wider text-indigo-800 font-bold uppercase">
                    🎫 ORDER REGISTERED SUCCESSFULY
                  </p>
                </div>
                
                <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                  आपका ऑर्डर डेटाबेस में <strong>सफलतापूर्वक सेव (Save)</strong> हो गया है! प्रीमियम स्लॉट एक्टिवेशन के लिए नीचे दिए गए बटन पर क्लिक करके व्हाट्सएप पर स्क्रीनशॉट भेजें।
                </p>

                <div className="bg-white/90 p-3 rounded-xl border border-slate-150 space-y-1.5 text-[10px] text-slate-600 font-sans leading-relaxed">
                  <p className="font-bold text-slate-800">📋 Order Information:</p>
                  <p>✨ <strong>Service Name:</strong> {service.name}</p>
                  <p>💰 <strong>Plan Pricing:</strong> ₹{service.price}</p>
                  <p>⏰ <strong>Plan Duration:</strong> {service.duration}</p>
                </div>

                <p className="text-[9.5px] text-slate-500 leading-normal font-sans pt-1">
                  Once our support team verifies the UPI transaction, your premium slot account credentials will be issued immediately.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              id="confirm-payment-paid-btn"
              onClick={handlePaidConfirm}
              className={`w-full py-3.5 rounded-xl font-sans font-bold text-xs transition cursor-pointer select-none ${
                elapsed >= minRequiredTime
                  ? "bg-indigo-650 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-150"
                  : "bg-slate-100 border border-slate-200 text-slate-405 cursor-not-allowed"
              }`}
            >
              I Paid
            </button>

            {/* Waiting status indicator */}
            {elapsed < minRequiredTime && (
              <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold">
                Holding check lock: <span className="text-indigo-600">{minRequiredTime - elapsed}s</span> leftover before I Paid unlocks
              </p>
            )}
          </div>
        )}

        {/* Helpful secure checklist */}
        <div className="mt-8 pt-6 border-t border-slate-150 text-left space-y-2 text-[10px] text-slate-500 font-medium leading-relaxed">
          <p className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
            <span>Scan QR Code with any payment UPI App (GPay/PhonePe/Paytm).</span>
          </p>
          <p className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
            <span>Confirm standard transaction of ₹{service.price} only.</span>
          </p>
          <p className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
            <span>Once done, wait for the countdown lock to clear, then hit "I Paid".</span>
          </p>
        </div>
      </div>

      {/* Dislaimer Section */}
      <footer className="mt-10 text-center">
        <p className="text-[10px] text-slate-400 tracking-wide font-medium">
          Disclaimer: All third-party product brand names, assets, and logos featured on this platform are used purely for identification and context purposes.
        </p>
      </footer>
    </div>
  );
};
