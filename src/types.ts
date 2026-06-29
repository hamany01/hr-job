/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Recruiter' | 'Interviewer';
  avatar_url?: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  status: 'Active' | 'Closed' | 'Draft';
  location: string;
  type: 'Full-time' | 'Part-time' | 'Remote';
  description: string;
  created_at: string;
}

export interface Candidate {
  id: string;
  name: string;
  phone: string;
  resume_url?: string;
  source: string;
  created_at: string;
}

export interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  status: 'New' | 'Screening' | 'Interviewing' | 'Offered' | 'Rejected' | 'Hired';
  applied_date: string;
  resume_url?: string;
  notes?: string;
  hybrid_token?: string;
}

export interface Interview {
  id: string;
  application_id: string;
  date: string;
  time: string;
  duration: number; // in minutes
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  type: 'Technical' | 'HR' | 'Managerial';
  room_number?: string;
  meeting_link?: string;
  whatsapp_link_sent: boolean;
  waiting_room_status: 'Not Joined' | 'Waiting' | 'In Progress' | 'Finished';
}

export interface Evaluation {
  id: string;
  interview_id: string;
  evaluator_id: string;
  score: number; // 1 to 5
  technical_skills: string;
  communication_skills: string;
  cultural_fit: string;
  summary_notes: string;
  recommendation: 'Hire' | 'Strong Hire' | 'No Hire' | 'Hold';
}
