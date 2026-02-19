export interface DashboardClient {
  id: string;
  name: string;
  phone: string;
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
  nextAppointment: DashboardAppointment | null;
  todayCount: number;
  alerts: DashboardAlert[];
  metrics: {
    dailyRevenue: number | null;
    weekAppointments: number | null;
    noShow30d: number | null;
  };
  setupChecklist: SetupChecklistState;
  generatedAt: string;
}
