import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ClientHome from "./pageClient";

export default async function HomePage() {
	const supabase = await createClient();
	const { data, error } = await supabase.auth.getUser();
	if (error || !data?.user) {
		redirect("/login");
	}
	return <ClientHome />;
}

