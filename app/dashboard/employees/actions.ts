"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function inviteEmployee(formData: FormData) {
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const roleId = formData.get("role_id") as string;
  const shopId = formData.get("shop_id") as string;

  if (!email || !roleId || !shopId || !name) {
    return {
      error: "Missing required fields (Name, Email, and Role are required).",
    };
  }

  const cookieStore = cookies();
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );

  // 1. Invite user via Supabase Auth
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard`,
    });

  if (authError || !authData.user) {
    return { error: authError?.message || "Failed to send invitation email." };
  }

  // 2. Insert into shop_user with Name, Phone, and Role
  const { error: shopUserError } = await supabaseAdmin
    .from("shop_user")
    .insert({
      shop_id: shopId,
      user_id: authData.user.id,
      roles_id: roleId,
      name: name,
      phone: phone || null,
    });

  if (shopUserError) {
    return { error: shopUserError.message };
  }

  return { success: true };
}
