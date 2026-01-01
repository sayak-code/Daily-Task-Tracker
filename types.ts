
export type Category = 'Health' | 'Work' | 'Personal' | 'Finance' | 'Creative';

export interface Habit {
  id: string;
  name: string;
  category: Category;
  color: string;
  logs: { [date: string]: boolean }; // YYYY-MM-DD
  streak: number;
  createdAt: number;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  category: Category;
  date: string; // YYYY-MM-DD
}

export interface DailySummary {
  date: string;
  completionRate: number;
  tasksDone: number;
  habitsDone: number;
}

export interface AppState {
  habits: Habit[];
  tasks: Task[];
  userName: string;
}
