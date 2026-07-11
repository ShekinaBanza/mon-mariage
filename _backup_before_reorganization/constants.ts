// Centralized status & role constants — avoids magic strings across the codebase.

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ORGANIZER: "organizer",
  REGISTRATION_AGENT: "registration_agent",
  CONTROL_AGENT: "control_agent",
  READER: "reader",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrateur",
  organizer: "Organisateur",
  registration_agent: "Agent d'enregistrement",
  control_agent: "Agent de contrôle à l'entrée",
  reader: "Lecteur des statistiques",
};

// Permissions matrix per role
export const PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  organizer: [
    "dashboard:view",
    "guests:view",
    "guests:edit",
    "guests:validate",
    "guests:cancel",
    "tables:manage",
    "floorplan:manage",
    "settings:manage",
    "exports:view",
    "scanner:use",
    "lists:print",
  ],
  registration_agent: [
    "dashboard:view",
    "guests:view",
    "guests:edit",
    "guests:validate",
    "tables:view",
    "lists:print",
  ],
  control_agent: ["scanner:use", "guests:view", "lists:print"],
  reader: ["dashboard:view", "guests:view", "exports:view"],
};

export function can(role: string, permission: string): boolean {
  const perms = PERMISSIONS[role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}

export const INVITATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  ACTIVE: "active",
  EXPIRED: "expired",
} as const;

export const INVITATION_STATUS_LABELS: Record<string, string> = {
  pending: "En attente de validation",
  approved: "Validée",
  rejected: "Refusée",
  cancelled: "Annulée",
  active: "Active",
  expired: "Expirée",
};

export const ASSIGNMENT_STATE = {
  UNASSIGNED: "unassigned",
  PARTIALLY_ASSIGNED: "partially_assigned",
  ASSIGNED: "assigned",
} as const;

export const PRESENCE_STATE = {
  NOT_ARRIVED: "not_arrived",
  PARTIALLY_ARRIVED: "partially_arrived",
  ARRIVED: "arrived",
  REFUSED_ENTRY: "refused_entry",
} as const;

export const PRESENCE_LABELS: Record<string, string> = {
  not_arrived: "Absent",
  partially_arrived: "Partiellement arrivé",
  arrived: "Arrivé",
  refused_entry: "Entrée refusée",
};

export const SEAT_STATUS = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  OCCUPIED: "occupied",
  DISABLED: "disabled",
} as const;

export const SEAT_STATUS_LABELS: Record<string, string> = {
  available: "Libre",
  reserved: "Réservée",
  occupied: "Occupée",
  disabled: "Désactivée",
};

export const SEAT_STATUS_COLORS: Record<string, string> = {
  available: "#5E7A52",   // vert — libre
  reserved: "#C9821E",    // orange — en attente
  occupied: "#B5483E",    // rouge — occupée
  disabled: "#9B9588",    // gris — désactivée
};

// Overridden when the invited person has already arrived (blue)
export const ARRIVED_COLOR = "#3B6E8F";

export const TABLE_ZONE = {
  GROOM: "groom",
  BRIDE: "bride",
  COMMON: "common",
} as const;

export const TABLE_ZONE_LABELS: Record<string, string> = {
  groom: "Côté de l'homme",
  bride: "Côté de la femme",
  common: "Zone commune",
};

export const INVITATION_TYPE = {
  INDIVIDUAL: "individual",
  COUPLE: "couple",
} as const;

export const INVITATION_SIDE = {
  GROOM: "groom",
  BRIDE: "bride",
} as const;

export const SCAN_RESULT = {
  VALID: "valid",
  ALREADY_USED: "already_used",
  INVALID: "invalid",
  CANCELLED: "cancelled",
  REFUSED: "refused",
  ERROR: "error",
} as const;

export const VALIDATION_MODE = {
  AUTO: "auto",
  MANUAL: "manual",
} as const;

export const TABLE_FORMAT = {
  NUMERIC: "numeric",
  ALPHA: "alpha",
  CUSTOM: "custom",
} as const;
