"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Wand2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  genderValues,
  productSchema,
  type ProductInput,
  type ProductFormValues,
} from "@/lib/validations/product";
import { createProduct } from "@/actions/products";
import { uploadProductImage } from "@/actions/uploads";
import {
  createBrand,
  createCategory,
  createCollection,
  createSubcategory,
} from "@/actions/taxonomy";
import { TaxonomyQuickAdd } from "@/components/products/taxonomy-quick-add";
import { generateSku, generateBarcodeValue } from "@/lib/barcode";

type TaxonomyOption = { id: string; name: string };

export function ProductForm({
  taxonomy,
}: {
  taxonomy: {
    categories: TaxonomyOption[];
    subcategories: (TaxonomyOption & { categoryId: string })[];
    brands: TaxonomyOption[];
    collections: TaxonomyOption[];
  };
}) {
  const router = useRouter();
  const [categories, setCategories] = React.useState(taxonomy.categories);
  const [subcategories, setSubcategories] = React.useState(taxonomy.subcategories);
  const [brands, setBrands] = React.useState(taxonomy.brands);
  const [collections, setCollections] = React.useState(taxonomy.collections);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  const form = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      articleCode: "",
      name: "",
      description: "",
      gender: "WOMEN",
      gstRate: 5,
      images: [],
      isActive: true,
      mrp: 0,
      sellingPrice: 0,
      purchaseCost: 0,
      variants: [{ size: "", color: "", sku: "", barcode: "", openingQuantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const articleCode = form.watch("articleCode");
  const selectedCategoryId = form.watch("categoryId");
  const filteredSubcategories = subcategories.filter(
    (s) => !selectedCategoryId || s.categoryId === selectedCategoryId
  );

  function autoFillVariant(index: number) {
    const size = form.getValues(`variants.${index}.size`);
    const color = form.getValues(`variants.${index}.color`);
    if (!size || !color) {
      toast.error("Enter size and color first");
      return;
    }
    form.setValue(
      `variants.${index}.sku`,
      generateSku(articleCode || "ART", size, color)
    );
    form.setValue(`variants.${index}.barcode`, generateBarcodeValue());
  }

  async function handleImageUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.set("file", file);
        const { url } = await uploadProductImage(formData);
        uploaded.push(url);
      }
      form.setValue("images", [...(form.getValues("images") ?? []), ...uploaded]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setIsUploading(false);
    }
  }

  function removeImage(url: string) {
    form.setValue(
      "images",
      (form.getValues("images") ?? []).filter((u) => u !== url)
    );
  }

  async function onSubmit(values: ProductInput) {
    setIsSubmitting(true);
    try {
      const created = await createProduct(values);
      toast.success("Product created");
      router.push(`/products/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create product");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Article code</Label>
            <Input {...form.register("articleCode")} placeholder="LEH-00123" />
            {form.formState.errors.articleCode && (
              <p className="text-sm text-destructive">
                {form.formState.errors.articleCode.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Product name</Label>
            <Input {...form.register("name")} placeholder="Rani Pink Bridal Lehenga" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Textarea {...form.register("description")} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
          <CardDescription>Category, brand and collection taxonomy.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex gap-2">
              <Select
                value={form.watch("categoryId")}
                onValueChange={(v) => form.setValue("categoryId", v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TaxonomyQuickAdd
                label="Category"
                onCreate={(name) => createCategory({ name })}
                onCreated={(item) => {
                  setCategories((prev) => [...prev, item]);
                  form.setValue("categoryId", item.id);
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subcategory</Label>
            <div className="flex gap-2">
              <Select
                value={form.watch("subcategoryId")}
                onValueChange={(v) => form.setValue("subcategoryId", v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TaxonomyQuickAdd
                label="Subcategory"
                onCreate={(name) =>
                  createSubcategory({ name, categoryId: selectedCategoryId || "" })
                }
                onCreated={(item) => {
                  setSubcategories((prev) => [
                    ...prev,
                    { ...item, categoryId: selectedCategoryId || "" },
                  ]);
                  form.setValue("subcategoryId", item.id);
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Brand</Label>
            <div className="flex gap-2">
              <Select
                value={form.watch("brandId")}
                onValueChange={(v) => form.setValue("brandId", v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TaxonomyQuickAdd
                label="Brand"
                onCreate={(name) => createBrand({ name })}
                onCreated={(item) => {
                  setBrands((prev) => [...prev, item]);
                  form.setValue("brandId", item.id);
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Collection</Label>
            <div className="flex gap-2">
              <Select
                value={form.watch("collectionId")}
                onValueChange={(v) => form.setValue("collectionId", v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TaxonomyQuickAdd
                label="Collection"
                onCreate={(name) => createCollection({ name })}
                onCreated={(item) => {
                  setCollections((prev) => [...prev, item]);
                  form.setValue("collectionId", item.id);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attributes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={form.watch("gender")}
              onValueChange={(v) => form.setValue("gender", v as ProductInput["gender"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {genderValues.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Season</Label>
            <Input {...form.register("season")} placeholder="Spring/Summer 2026" />
          </div>
          <div className="space-y-2">
            <Label>Occasion</Label>
            <Input {...form.register("occasion")} placeholder="Bridal, Festive" />
          </div>
          <div className="space-y-2">
            <Label>Fabric</Label>
            <Input {...form.register("fabric")} placeholder="Silk, Georgette" />
          </div>
          <div className="space-y-2">
            <Label>Pattern</Label>
            <Input {...form.register("pattern")} placeholder="Embroidered" />
          </div>
          <div className="space-y-2">
            <Label>Sleeve type</Label>
            <Input {...form.register("sleeveType")} placeholder="Full sleeve" />
          </div>
          <div className="space-y-2">
            <Label>Neck type</Label>
            <Input {...form.register("neckType")} placeholder="Sweetheart" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & tax</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label>MRP (₹)</Label>
            <Input type="number" step="0.01" {...form.register("mrp")} />
          </div>
          <div className="space-y-2">
            <Label>Selling price (₹)</Label>
            <Input type="number" step="0.01" {...form.register("sellingPrice")} />
          </div>
          <div className="space-y-2">
            <Label>Purchase cost (₹)</Label>
            <Input type="number" step="0.01" {...form.register("purchaseCost")} />
          </div>
          <div className="space-y-2">
            <Label>GST rate (%)</Label>
            <Input type="number" step="0.01" {...form.register("gstRate")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            Uploaded to cloud file storage (S3/R2 in production, local disk in dev).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {(form.watch("images") ?? []).map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Product"
                  className="size-24 rounded border object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 size-6"
                  onClick={() => removeImage(url)}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
          <div>
            <Label htmlFor="product-images" className="cursor-pointer">
              <div className="flex items-center gap-2 rounded border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-accent">
                <Upload className="size-4" />
                {isUploading ? "Uploading..." : "Click to upload image(s)"}
              </div>
            </Label>
            <Input
              id="product-images"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              disabled={isUploading}
              onChange={(e) => handleImageUpload(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Size & color variants</CardTitle>
            <CardDescription>
              Each size/color combination tracks its own inventory, SKU and barcode.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ size: "", color: "", sku: "", barcode: "", openingQuantity: 0 })
            }
          >
            <Plus /> Add variant
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Size</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Opening qty</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Input {...form.register(`variants.${index}.size`)} placeholder="M" />
                    </TableCell>
                    <TableCell>
                      <Input {...form.register(`variants.${index}.color`)} placeholder="Rani Pink" />
                    </TableCell>
                    <TableCell>
                      <Input {...form.register(`variants.${index}.sku`)} placeholder="Auto" />
                    </TableCell>
                    <TableCell className="flex items-center gap-1">
                      <Input {...form.register(`variants.${index}.barcode`)} placeholder="Auto" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Generate SKU & barcode"
                        onClick={() => autoFillVariant(index)}
                      >
                        <Wand2 className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-24"
                        {...form.register(`variants.${index}.openingQuantity`)}
                      />
                    </TableCell>
                    <TableCell>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {form.formState.errors.variants?.message && (
            <p className="mt-2 text-sm text-destructive">
              {form.formState.errors.variants.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <Label>Active</Label>
            <p className="text-sm text-muted-foreground">
              Inactive products are hidden from POS and catalog listings.
            </p>
          </div>
          <Switch
            checked={form.watch("isActive")}
            onCheckedChange={(v) => form.setValue("isActive", v)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save product"}
        </Button>
      </div>
    </form>
  );
}
