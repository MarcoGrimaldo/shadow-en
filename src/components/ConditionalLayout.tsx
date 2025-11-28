"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't show navbar on practice page
  const showNavbar = pathname !== "/practice";

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
}
