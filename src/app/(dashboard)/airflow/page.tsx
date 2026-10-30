import { AirflowDashboard } from "@/modules/airflow/ui/components/AirflowDashboard";

export const metadata = {
  title: "Airflow Pipelines | EdClarity.ai",
  description: "Monitor and trigger Apache Airflow data ingestion and background maintenance DAGs.",
};

export default function AirflowPage() {
  return <AirflowDashboard />;
}
