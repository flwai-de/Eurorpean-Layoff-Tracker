"use client";

import { useEffect } from "react";

export default function ViewCounter({ id }: { id: string }) {
  useEffect(() => {
    fetch(`/api/public/layoffs/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  return null;
}
