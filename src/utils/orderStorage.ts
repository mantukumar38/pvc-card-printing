// Order storage utility
// Files: Cloudinary (free 25 GB)
// Database: Firebase Firestore (free 50K reads/day)

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { uploadToCloudinary, getCloudinaryDownloadUrl } from "./cloudinary";

export interface SavedOrderFile {
  name: string;
  type: string;
  url: string; // Cloudinary URL
  publicId: string; // Cloudinary public ID
  size: number;
  resourceType?: "image" | "raw"; // Cloudinary resource type
}

export interface SavedOrder {
  id: string;
  trackingId: string;
  date: string;
  customer: {
    name: string;
    phone: string;
    state: string;
  };
  quantity: number;
  amount: number;
  discount: number;
  paymentMode: "upi" | "whatsapp";
  paymentStatus: "pending" | "paid";
  transactionId?: string;
  notes?: string;
  files: SavedOrderFile[];
  status: "received" | "processing" | "printing" | "quality_check" | "shipped" | "delivered";
  statusHistory: { status: string; date: string }[];
  createdAt?: Timestamp;
}

const ORDERS_COLLECTION = "orders";

// Generate sequential tracking ID
async function generateTrackingId(): Promise<string> {
  try {
    const orders = await getAllOrders();
    const nextNum = (orders.length + 1).toString().padStart(4, "0");
    return `PVC${nextNum}`;
  } catch {
    // Fallback: use timestamp-based ID
    return `PVC${Date.now().toString().slice(-6)}`;
  }
}

// Get all orders from Firestore
export async function getAllOrders(): Promise<SavedOrder[]> {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...(d.data() as SavedOrder), id: d.id }));
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return [];
  }
}

// Save a new order with files (uploads to Cloudinary)
export async function saveOrder(order: {
  customer: { name: string; phone: string; state: string };
  quantity: number;
  amount: number;
  discount: number;
  paymentMode: "upi" | "whatsapp";
  paymentStatus: "pending" | "paid";
  transactionId?: string;
  notes?: string;
  files: { name: string; type: string; data: string }[]; // base64 input
}): Promise<SavedOrder> {
  const trackingId = await generateTrackingId();
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  // Upload all files to Cloudinary in parallel
  const uploadedFiles: SavedOrderFile[] = await Promise.all(
    order.files.map(async (file) => {
      const result = await uploadToCloudinary(file, trackingId);
      return {
        name: file.name || `file-${Date.now()}.${result.format}`,
        type: file.type,
        url: result.url,
        publicId: result.publicId,
        size: result.size,
        resourceType: result.resourceType as "image" | "raw",
      };
    })
  );

  const orderData = {
    trackingId,
    date: now,
    customer: order.customer,
    quantity: order.quantity,
    amount: order.amount,
    discount: order.discount,
    paymentMode: order.paymentMode,
    paymentStatus: order.paymentStatus,
    transactionId: order.transactionId || "",
    notes: order.notes || "",
    files: uploadedFiles,
    status: "received" as const,
    statusHistory: [{ status: "Order Received", date: now }],
    createdAt: serverTimestamp(),
  };

  // Save to Firestore
  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), orderData);

  return {
    ...orderData,
    id: docRef.id,
    createdAt: undefined,
  } as SavedOrder;
}

// Update order status
export async function updateOrderStatus(orderId: string, status: SavedOrder["status"]): Promise<void> {
  const orders = await getAllOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  const statusLabels: Record<SavedOrder["status"], string> = {
    received: "Order Received",
    processing: "Processing",
    printing: "Printing",
    quality_check: "Quality Check",
    shipped: "Shipped",
    delivered: "Delivered",
  };
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const newHistory = [...order.statusHistory, { status: statusLabels[status], date: now }];

  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    status,
    statusHistory: newHistory,
  });
}

// Update payment status
export async function updatePaymentStatus(orderId: string, status: "pending" | "paid"): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), { paymentStatus: status });
}

// Delete order from Firestore
// Note: Cloudinary files won't be auto-deleted (would need backend with API secret)
// You can manually delete them from Cloudinary dashboard if needed
export async function deleteOrder(orderId: string): Promise<void> {
  await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
}

// Get order by tracking ID
export async function getOrderByTrackingId(trackingId: string): Promise<SavedOrder | undefined> {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where("trackingId", "==", trackingId.toUpperCase())
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return undefined;
    const docSnap = snapshot.docs[0];
    return { ...(docSnap.data() as SavedOrder), id: docSnap.id };
  } catch (error) {
    console.error("Failed to fetch order by tracking ID:", error);
    return undefined;
  }
}

// Get stats from orders
export async function getStats() {
  const orders = await getAllOrders();
  return {
    total: orders.length,
    pending: orders.filter((o) => o.status === "received").length,
    inProgress: orders.filter((o) => ["processing", "printing", "quality_check"].includes(o.status)).length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    totalRevenue: orders.filter((o) => o.paymentStatus === "paid").reduce((sum, o) => sum + o.amount, 0),
    pendingPayment: orders.filter((o) => o.paymentStatus === "pending").reduce((sum, o) => sum + o.amount, 0),
  };
}

// Download a file - fetches from Cloudinary URL and triggers browser download
// Works for both images (resource_type=image) and PDFs/docs (resource_type=raw)
export async function downloadFile(file: SavedOrderFile): Promise<boolean> {
  try {
    // METHOD 1: Fetch as blob and trigger download (most reliable, preserves filename)
    try {
      const response = await fetch(file.url, { mode: "cors" });
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = file.name || `download-${Date.now()}`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 1000);
        return true;
      }
    } catch (fetchError) {
      console.warn("Blob download failed, trying Cloudinary attachment URL:", fetchError);
    }

    // METHOD 2: Use Cloudinary's fl_attachment URL with filename
    // This works for both image and raw resource types
    const downloadUrl = getCloudinaryDownloadUrl(file.url, file.name);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = file.name || `download-${Date.now()}`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 1000);
    return true;
  } catch (error) {
    console.error("Download failed:", error);
    return false;
  }
}

// Get a direct view URL for a file (for preview in modal)
export function getFileViewUrl(file: SavedOrderFile): string {
  return file.url;
}

// Get download URL with fl_attachment for proper download
export function getFileDownloadUrl(file: SavedOrderFile): string {
  return getCloudinaryDownloadUrl(file.url, file.name);
}

// Export all orders as JSON (backup)
export async function exportOrdersJSON(): Promise<void> {
  const orders = await getAllOrders();
  const blob = new Blob([JSON.stringify(orders, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pvc-orders-backup-${new Date().toISOString().split("T")[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
