"use client";

import { useEffect, useState } from "react";
import { getUsers } from "@/services/userService.js";

export function useSuperAdminTotal(enabled, refreshKey) {
  const [total, setTotal] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    getUsers({ role: "SUPERADMIN", isActive: "true", pageSize: 2 })
      .then((page) => !cancelled && setTotal(page.pagination.total))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  return total;
}

export function deleteBlockedReason(account, currentUserId, superAdminTotal) {
  if (account.id === currentUserId) return "Tidak bisa menghapus akun sendiri.";
  if (account.role === "SUPERADMIN" && account.isActive && superAdminTotal !== null && superAdminTotal <= 1) {
    return "Tidak bisa menghapus SUPERADMIN aktif terakhir.";
  }
  return null;
}
