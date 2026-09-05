import { PaymentMethodDetailPage } from "@/components/setup/DirectoryDetail";

export default async function SetupPaymentMethodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentMethodDetailPage id={id} />;
}