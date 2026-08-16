import { Role } from "@/lib/types/enums";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    name?: string | null;
    email?: string | null;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      name?: string | null;
      email?: string | null;
      mustChangePassword?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    mustChangePassword?: boolean;
  }
}
