export interface CourseEvent {
  summary: string;
  start: Date | string;
  end: Date | string;
  location?: string;
  description?: string;
  prof?: string;
  [key: string]: unknown;
}

export interface SplitGroupInfo {
  professors: string[];
  rooms: string[];
}

