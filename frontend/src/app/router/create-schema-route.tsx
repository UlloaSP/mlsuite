import { useGetModels } from "@/features/models/api/model.queries";
import { CreateSchemaPage } from "@/features/schemas/pages/create-schema-page";

export function CreateSchemaRoute() {
  const { data: models = [], isLoading } = useGetModels();
  return <CreateSchemaPage models={models} isLoading={isLoading} />;
}
