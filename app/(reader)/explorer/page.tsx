import { Explorer } from "../../components/explorer";
import { connection } from "next/server";

export const metadata = {
  title: "SpecKub Explorer — Read public repository API specs.",
  description:
    "Read API specifications from any public GitHub repository using SpecKub. Browse branches, search endpoints, and explore service diagrams.",
};

export default async function ExplorerPage() {
  await connection();
  return <Explorer />;
}
