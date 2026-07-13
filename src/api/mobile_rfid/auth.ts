import { NextRequest, NextResponse } from "next/server";
import { MobileRfidService } from "./service";
import { handleError } from "./utils";

export const AuthController = {
  async login(req: NextRequest) {
    try {
      const { email, password } = await req.json();
      const data = await MobileRfidService.signIn(email, password);
      return NextResponse.json({
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      });
    } catch (err) {
      return handleError(err);
    }
  },

  async refresh(req: NextRequest) {
    try {
      const { refresh_token } = await req.json();
      const data = await MobileRfidService.refreshSession(refresh_token);
      return NextResponse.json({
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_in: data.session?.expires_in,
      });
    } catch (err) {
      return handleError(err);
    }
  },

  async profile(req: NextRequest, user: any) {
    try {
      const profile = await MobileRfidService.fetchProfile(user.userId);
      return NextResponse.json([
        {
          full_name: profile.full_name,
          role: profile.role,
          branch_id: profile.branch_id,
          branches: profile.branches,
        },
      ]);
    } catch (err) {
      return handleError(err);
    }
  },
};
