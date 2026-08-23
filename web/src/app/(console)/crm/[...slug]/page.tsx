import { DepartmentPage } from "@/components/DepartmentPage";
import {
  CrmActivityManager,
  CrmContactsManager,
  CrmDealsManager,
  CrmIssuesManager,
  CrmOverviewManager,
  CrmPipelineManager,
  CrmProjectsManager,
  CrmTicketsManager,
} from "@/components/crm/CrmManagers";

export default async function CrmPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ project?: string }>;
}) {
  const { slug = [] } = await params;
  const { project } = await searchParams;
  const key = slug.join("/");

  if (key === "" || key === "overview") return <CrmOverviewManager />;
  if (key === "contacts") return <CrmContactsManager />;
  if (key === "deals") return <CrmDealsManager />;
  if (key === "pipeline") return <CrmPipelineManager />;
  if (key === "tickets") return <CrmTicketsManager />;
  if (key === "activity") return <CrmActivityManager />;
  if (key === "projects") return <CrmProjectsManager />;
  if (key === "issues") return <CrmIssuesManager initialProjectId={project} />;

  return (
    <DepartmentPage
      kicker="Workspace · Support"
      title={slug.length ? slug.join(" / ") : "Support"}
    />
  );
}
