export type ShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL' | '4XL' | '5XL';
export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid';
export type PaymentMethod = 'Cash (In-person)' | 'Online (GCash)';

export interface Registrant {
  id: string;
  fullName: string;
  age: number | null;
  sex: 'Male' | 'Female';
  ministry: string[];
  shirtSize: ShirtSize;
  church: string;
  feeType: 'Early Bird' | 'Regular';
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  gcRef: string | null;
  amountPaid: number;
  dateRegistered: string; // ISO Date String
  merchClaims: {
    tshirt: boolean;
    bag: boolean;
    notebook: boolean;
    pen: boolean;
  };
  merchClaimDates: {
    tshirt: string | null;
    bag: string | null;
    notebook: string | null;
    pen: string | null;
  };
  verifiedByTreasurer: boolean;
  verifiedAt: string | null;
}

export type ExpenseCategory = 'Food' | 'Venue' | 'Supplies' | 'Transportation' | 'Others' | 'Merch Production';

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // ISO Date string
  paidBy: string;
  method: string;
  verifiedByTreasurer: boolean;
  verifiedAt: string | null;
  createdBy?: string;
}

export interface Solicitation {
  id: string;
  sourceName: string;
  type: string;
  amount: number;
  dateReceived: string; // ISO Date string
  paymentMethod: string;
  notes: string;
  verifiedByTreasurer: boolean;
  verifiedAt: string | null;
  createdBy?: string;
}

export interface AppSettings {
  merchCosts: {
    tshirt: number;
    bag: number;
    notebook: number;
    pen: number;
  };
  churches: string[];
  churchColors: Record<string, string>;
  ministries: string[];
  expenseCategories: string[];
  paymentMethods: string[];
  solicitationTypes: string[];
  shirtSizePhoto: string | null;
  permissionMatrix?: PermissionMatrix;
}

export type UserRole = 'admin' | 'coordinator';

export interface PermissionMatrixRole {
  dashboard: { view: boolean };
  registrants: { view: boolean; viewAll: boolean; add: boolean; editOwn: boolean; editAny: boolean; deleteOwn: boolean; deleteAny: boolean };
  merch: { view: boolean; toggleOwn: boolean; toggleAll: boolean };
  expenses: { view: boolean; viewAll: boolean; add: boolean; editOwn: boolean; editAny: boolean; deleteOwn: boolean; deleteAny: boolean };
  solicitations: { view: boolean; add: boolean; edit: boolean; delete: boolean; verify: boolean };
  reports: { view: boolean; exportCsv: boolean };
  activitylogs: { view: boolean };
}

export type PermissionMatrix = Record<string, PermissionMatrixRole>;

export interface AppUser {
  _id: string;
  pin: string;
  role: UserRole;
  church: string;
}
