import { redirect } from "next/navigation";

/** Legacy access-login URL — app is publicly readable now. */
export default function LoginPage() {
  redirect("/mindmap");
}
