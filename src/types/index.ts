export interface User {
  id: string;
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface SessionState {
  auth_state:
    | "unknown"
    | "inited"
    | "wait_phone"
    | "wait_code"
    | "wait_password"
    | "ready";
  phone?: string;
}

export interface AuthTokenResponse {
  token: string;
}

export interface Scenario {
  id: string;
  name: string;
  trigger_phrase: string;
  reminder_title_template: string;
  reminder_description_template?: string;
  reminder_minutes_before: number;
  is_active: boolean;
}

export interface Chat {
  id: number;
  name: string;
  type: "private" | "group" | "channel";
  is_selected: boolean;
  message_count?: number;
}

export interface ReminderFile {
  file_id: string;
}

export interface CalendarURLResponse {
  url: string;
}
