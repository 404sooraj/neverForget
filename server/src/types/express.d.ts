import { IUser } from '../modals/user.modals';

declare module 'express' {
  interface Request {
    user?: {
      _id: string;
    };
  }
} 