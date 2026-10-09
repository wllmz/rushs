import { redirect } from "next/navigation";
import { HOME_PATH } from "@/features/auth/routes";

// The proxy sends signed-out visitors to the sign-in page before this runs
export default function Home() {
  redirect(HOME_PATH);
}
