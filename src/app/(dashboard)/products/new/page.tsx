import { listTaxonomy } from "@/actions/taxonomy";
import { ProductForm } from "@/components/products/product-form";

export default async function NewProductPage() {
  const taxonomy = await listTaxonomy();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add product</h1>
        <p className="text-sm text-muted-foreground">
          Define attributes once, then manage size/color variants below.
        </p>
      </div>
      <ProductForm taxonomy={taxonomy} />
    </div>
  );
}
