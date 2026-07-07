"use client";

import { useState, useTransition } from "react";
import { SellerDashboard } from "@/components/seller-dashboard";
import { SellerOnboarding } from "@/components/seller-onboarding";
import { createProduct, createSeller, deleteProduct, updateProduct, updateShippingStatus } from "@/lib/actions/seller";
import { emptyOnboarding, type SellerOnboardingState, type DemoSellerRecord, type DemoSellerProduct } from "@/lib/demo-seller";

export function LiveSellerPortal({
  sellerInfo,
  initialProducts,
  initialOrders,
  sellerMetrics
}: {
  sellerInfo: any;
  initialProducts: any[];
  initialOrders: any[];
  sellerMetrics?: any;
}) {
  const [form, setForm] = useState<SellerOnboardingState>(emptyOnboarding);
  const [isPending, startTransition] = useTransition();

  function mapToDemoSeller(): DemoSellerRecord | null {
    if (!sellerInfo) return null;
    return {
      id: sellerInfo.sellerId,
      name: "Seller",
      email: "seller@example.com",
      shopName: sellerInfo.storeName,
      status: "Verified",
      submittedAt: new Date().toISOString(),
      rejectionMessage: undefined
    };
  }

  function mapToDemoProducts(): DemoSellerProduct[] {
    return initialProducts.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      stock: p.stockQuantity ?? 0,
      category: p.category,
      material: p.material,
      yarnType: p.yarnType,
      status: p.status === "in_stock" ? "Approved" : "Pending",
      photos: p.imageUrl ? [p.imageUrl] : [],
      imageUrl: p.imageUrl,
      sellerId: sellerInfo.sellerId,
      sellerName: sellerInfo.storeName,
      performance: "average" as any,
      sales:
        sellerMetrics?.top_products?.find((entry: any) => entry.product_name === p.name)?.units_sold ?? 0,
      views: 0,
      addToCartCount: 0
    }));
  }

  function mapToDemoOrders(): any[] {
    return initialOrders.flatMap(o => o.items.map((item: any) => ({
      id: item.id,
      orderId: o.id,
      buyerId: o.buyerId,
      sellerId: sellerInfo.sellerId,
      productId: item.productId,
      productName: item.productName,
      productImageUrl: "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: (item.unitPrice + (item.customMargin ?? 0)) * item.quantity,
      shippingStatus: item.shippingStatus,
      createdAt: o.createdAt
    })));
  }

  function handleCompleteOnboarding() {
    startTransition(async () => {
      try {
        await createSeller(form);
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  function handleAddProduct() {
    startTransition(async () => {
      try {
        await createProduct({
          name: "New handmade listing",
          description: "Describe your product here...",
          price: 1500,
          stock_quantity: 5,
          category: "sweaters",
          material: "cotton",
          yarn_type: "standard"
        });
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  function handleUpdateProduct(productId: string, updates: any) {
    startTransition(async () => {
      try {
        await updateProduct(productId, updates);
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  function handleDeleteProduct(productId: string) {
    startTransition(async () => {
      try {
        await deleteProduct(productId);
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  function handleUpdateOrderStatus(orderItemId: string, status: string) {
    startTransition(async () => {
      try {
        await updateShippingStatus(orderItemId, status);
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  if (!sellerInfo) {
    return <SellerOnboarding form={form} setForm={setForm} onComplete={handleCompleteOnboarding} />;
  }

  return (
    <div className={isPending ? "opacity-50 pointer-events-none" : ""}>
      <SellerDashboard
        form={form}
        seller={mapToDemoSeller()}
        products={mapToDemoProducts()}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        orders={mapToDemoOrders()}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onEditOnboarding={() => {}}
      />
    </div>
  );
}
