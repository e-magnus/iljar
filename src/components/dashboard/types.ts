export type DashboardClinicalFlag =
  | 'ANTICOAGULANT'
  | 'DIABETES'
  | 'ALLERGY'
  | 'NEUROPATHY'
  | 'PACEMAKER'
  | 'OTHER';

export interface DashboardClient {
  id: string;
  name: string;
  phone: string;
  contactPhone?: string | null;
  clinicalFlags?: DashboardClinicalFlag[];
}

export interface DashboardAppointment {
  id: string;
  startTime: string;
  endTime: string;
  status: 'BOOKED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  type: string | null;
  client: DashboardClient;
}

export interface DashboardAlert {
  id: string;
  type: 'UNCONFIRMED' | 'REMINDER_FAILED' | 'UNPAID' | 'NO_SHOW';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface SetupChecklistState {
  services: boolean;
  openingHours: boolean;
  reminders: boolean;
  completed: number;
  total: number;
}

export interface DashboardSummaryResponse {
  currentUser: {
    name: string;
    email: string | null;
  };
  nextAppointment: DashboardAppointment | null;
  todayCount: number;
  alerts: DashboardAlert[];
  metrics: {
    weekBooked: number;
    weekNoShow: number;
    weekFreeSlots: number;
  };
  week: {
    offset: number;
    start: string;
    end: string;
  };
  setupChecklist: SetupChecklistState;
  generatedAt: string;
}
