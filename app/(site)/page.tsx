import { redirect } from "next/navigation";
import { HomeContent } from "../components/home";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.repo !== undefined) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      for (const entry of Array.isArray(value)
        ? value
        : value === undefined
          ? []
          : [value]) {
        query.append(key, entry);
      }
    }
    redirect(`/explorer?${query}`);
  }
  return <HomeContent />;
}
