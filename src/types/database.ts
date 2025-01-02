export interface User {
  id: string;
  full_name: string;
  email: string;
  cpf: string;
  pix_key: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  leader_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  team_id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}