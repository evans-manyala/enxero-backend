import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roleId: string;
        companyId: string; // Added for multi-tenant support
        email: string;
        role: {
          name: string;
          permissions: string[];
        };
        company?: {
          id: string;
          name: string;
          identifier: string;
        };
      };
    }
  }
} 