export const zar = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(n ?? 0);

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "";

export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export const CYLINDER_LABEL: Record<string, string> = {
  kg9: "9kg Cylinder",
  kg19: "19kg Cylinder",
  kg48: "48kg Cylinder",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  assigned: "Driver assigned",
  en_route: "En route",
  arriving: "Arriving",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_STEPS = ["pending", "assigned", "en_route", "arriving", "delivered"] as const;
