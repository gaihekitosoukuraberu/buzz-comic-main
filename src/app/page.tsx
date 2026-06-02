// NOTE: This file exists for legacy reasons. The actual homepage is at
// src/app/(main)/page.tsx which handles the "/" route via the (main) route group.
// Both files should not coexist - prefer deleting this file.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/gallery");
}
