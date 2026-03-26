export type ShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid';
export type PaymentMethod = 'Cash (In-person)' | 'Online (GCash)';

export interface Registrant {
  id: string;
  fullName: string;
  age: number;
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
}

export interface AppSettings {
  merchCosts: {
    tshirt: number;
    bag: number;
    notebook: number;
    pen: number;
  };
  churches: string[];
  ministries: string[];
  expenseCategories: string[];
  paymentMethods: string[];
  solicitationTypes: string[];
  shirtSizePhoto: string | null;
}

export type UserRole = 'admin' | 'coordinator' | 'treasurer';
