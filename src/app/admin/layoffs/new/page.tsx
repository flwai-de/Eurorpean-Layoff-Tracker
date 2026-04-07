import LayoffForm from "@/components/forms/layoff-form";
import { createLayoff } from "@/actions/layoffs";

export default function NewLayoffPage() {
  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold">New Layoff</h1>
      <LayoffForm action={createLayoff} />
    </div>
  );
}
