import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole[]>>({});

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: allRoles } = await supabase.from("user_roles").select("*");
    const roleMap: Record<string, AppRole[]> = {};
    allRoles?.forEach((r) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });
    setRoles(roleMap);
    setUsers(profiles || []);
  };

  const changeRole = async (userId: string, newRole: AppRole) => {
    // Remove existing non-user roles, add new one
    await supabase.from("user_roles").delete().eq("user_id", userId).neq("role", "user");
    if (newRole !== "user") {
      await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    }
    toast.success("Role updated");
    fetchUsers();
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8">User Management</h1>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4">User</th>
                <th className="p-4">Telegram</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const userRoles = roles[u.id] || ["user"];
                const primaryRole = userRoles.includes("admin") ? "admin" : userRoles.includes("moderator") ? "moderator" : "user";
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="p-4 font-medium">{u.display_name || "—"}</td>
                    <td className="p-4 text-muted-foreground">@{u.telegram_username || "—"}</td>
                    <td className="p-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        primaryRole === "admin" ? "bg-primary/20 text-primary" :
                        primaryRole === "moderator" ? "bg-warning/20 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>{primaryRole}</span>
                    </td>
                    <td className="p-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <Select value={primaryRole} onValueChange={(v) => changeRole(u.id, v as AppRole)}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
