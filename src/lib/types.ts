export type User = { id: string; name: string; email: string };

export type Student = {
  id: string;
  ownerId?: string;
  name: string;
  rollNumber: string;
  dateOfBirth: string | null;
  gender: string;
  email: string | null;
  phone: string;
  address: string;
  className: string;
  department: string;
  enrollmentDate: string;
  status: string;
  notes: string;
  customValues: Record<string, unknown>;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type CustomField = {
  id: string;
  label: string;
  type: "short_text" | "long_text" | "number" | "date" | "yes_no" | "single_select" | "multi_select" | "email" | "phone" | "url";
  required: boolean;
  options: string[];
  position: number;
  showOnCard: boolean;
  searchable: boolean;
  filterable: boolean;
  exportable: boolean;
  archived: boolean;
};
