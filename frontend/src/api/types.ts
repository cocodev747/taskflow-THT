export type Task = {
  id: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  userId: number;
};

export type User = {
  id: number;
  email: string;
};

export type AuthResult = {
  token: string;
  user: User;
};
