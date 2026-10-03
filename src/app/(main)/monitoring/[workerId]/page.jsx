import { redirect } from "next/navigation";

export default async function MonitoringWorkerRedirect({ params }) {
  const { workerId } = await params;
  redirect(`/workers/${workerId}`);
}
