"use client";

import { useLinkStatus } from "next/link";

export function NavigationPending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={`navigation-pending ${pending ? "is-pending" : ""}`} />;
}
