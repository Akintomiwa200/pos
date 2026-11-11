import { StockTakingModule } from "@/components/stock-taking/StockTakingModule";

export default async function StockTakingPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const mode = key === "initial" || key === "random" || key === "adjustments" || key === "history"
    ? key
    : "overview";

  return <StockTakingModule mode={mode} />;
}
