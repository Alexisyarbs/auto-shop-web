import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if the user has an active session on the server
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    // If not logged in, bounce them immediately to login
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Optional: Add a shared top navbar or sidebar for the dashboard here if you want */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
