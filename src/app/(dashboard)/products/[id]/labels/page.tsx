import { notFound } from "next/navigation";
import { getProduct } from "@/actions/products";
import { LabelSheet } from "@/components/products/label-sheet";

export default async function ProductLabelsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productData = await getProduct(id);
  if (!productData) notFound();

  return (
    <LabelSheet
      productName={productData.name}
      price={Number(productData.sellingPrice).toLocaleString("en-IN")}
      variants={productData.variants}
    />
  );
}
