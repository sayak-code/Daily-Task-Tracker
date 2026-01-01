
import { Category } from './types';

export const CATEGORIES: Category[] = ['Health', 'Work', 'Personal', 'Finance', 'Creative'];

export const CATEGORY_COLORS: Record<Category, string> = {
  Health: 'bg-emerald-500',
  Work: 'bg-blue-500',
  Personal: 'bg-rose-500',
  Finance: 'bg-amber-500',
  Creative: 'bg-violet-500',
};

export const LIGHT_CATEGORY_COLORS: Record<Category, string> = {
  Health: 'bg-emerald-100 text-emerald-700',
  Work: 'bg-blue-100 text-blue-700',
  Personal: 'bg-rose-100 text-rose-700',
  Finance: 'bg-amber-100 text-amber-700',
  Creative: 'bg-violet-100 text-violet-700',
};
