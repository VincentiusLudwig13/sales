import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to login page for now. Once auth is set up, this will redirect to dashboard if authenticated.
  redirect("/login");
}
