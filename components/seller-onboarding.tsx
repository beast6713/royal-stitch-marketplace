"use client";

import { Store } from "lucide-react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { SellerField, SellerTextArea, SellerUploadField } from "@/components/seller-form-fields";
import {
  onboardingSteps,
  specializationTags,
  type SellerOnboardingState
} from "@/lib/demo-seller";
import { CATEGORY_OPTIONS, MATERIAL_OPTIONS } from "@/lib/constants";

type UpdateField = <Key extends keyof SellerOnboardingState>(
  key: Key,
  value: SellerOnboardingState[Key]
) => void;

type ProductValidationErrors = Partial<Record<"title" | "price" | "category" | "images", string>>;

export function SellerOnboarding({
  form,
  setForm,
  onComplete
}: {
  form: SellerOnboardingState;
  setForm: Dispatch<SetStateAction<SellerOnboardingState>>;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [productErrors, setProductErrors] = useState<ProductValidationErrors>({});

  function validateProductStep() {
    const nextErrors: ProductValidationErrors = {};

    if (!form.productTitle.trim()) {
      nextErrors.title = "Product title is required.";
    }

    if (!form.productCategory.trim()) {
      nextErrors.category = "Choose a category.";
    }

    if (!Number.isFinite(Number(form.productPrice)) || Number(form.productPrice) <= 0) {
      nextErrors.price = "Enter a valid price.";
    }

    if (form.productImages.length === 0) {
      nextErrors.images = "Upload at least 1 product image.";
    }

    setProductErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function continueToNextStep() {
    if (step === 3 && !validateProductStep()) {
      return;
    }

    setStep((current) => Math.min(current + 1, onboardingSteps.length - 1));
  }

  function completeFlow() {
    if (!validateProductStep()) {
      setStep(3);
      return;
    }

    onComplete();
  }

  function updateField<Key extends keyof SellerOnboardingState>(
    key: Key,
    value: SellerOnboardingState[Key]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateFileName(key: "governmentIdFile" | "profileImage", event: ChangeEvent<HTMLInputElement>) {
    updateField(key, event.target.files?.[0]?.name ?? "");
  }

  function updateProductImages(event: ChangeEvent<HTMLInputElement>) {
    updateField(
      "productImages",
      Array.from(event.target.files ?? []).map((file) => file.name)
    );
  }

  function toggleTag(tag: string) {
    setForm((current) => {
      const exists = current.tags.includes(tag);
      return {
        ...current,
        tags: exists ? current.tags.filter((entry) => entry !== tag) : [...current.tags, tag]
      };
    });
  }

  return (
    <main className="shell py-8 pb-20">
      <section className="panel overflow-hidden bg-white/45 p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="tag">
              <Store className="h-3.5 w-3.5" />
              Start selling
            </div>
            <h1 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">
              Open your Royal Stitch shop.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-royal/70 sm:text-base">
              Complete the demo onboarding flow, publish your first product, and preview the seller workspace.
            </p>
          </div>
          <div className="min-w-[220px] rounded-[24px] border border-royal/10 bg-white/80 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/55">
              Step {step + 1} of {onboardingSteps.length}
            </p>
            <p className="mt-2 font-display text-3xl text-royal">{onboardingSteps[step]}</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="h-2 overflow-hidden rounded-full bg-royal/10">
            <div
              className="h-full rounded-full bg-royal transition-all"
              style={{ width: `${((step + 1) / onboardingSteps.length) * 100}%` }}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {onboardingSteps.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  index === step ? "bg-royal text-white" : "bg-white text-royal"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel mt-8 p-6 sm:p-10">
        {step === 0 ? (
          <RegistrationStep form={form} updateField={updateField} />
        ) : step === 1 ? (
          <VerificationStep form={form} updateField={updateField} updateFileName={updateFileName} />
        ) : step === 2 ? (
          <ProfileStep
            form={form}
            updateField={updateField}
            updateFileName={updateFileName}
            toggleTag={toggleTag}
          />
        ) : step === 3 ? (
          <ProductStep
            form={form}
            updateField={updateField}
            updateProductImages={updateProductImages}
            errors={productErrors}
          />
        ) : step === 4 ? (
          <ShippingStep form={form} updateField={updateField} />
        ) : (
          <PoliciesStep form={form} updateField={updateField} />
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-royal/10 pt-6">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
            disabled={step === 0}
            className="button-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>
          {step < onboardingSteps.length - 1 ? (
            <button
              type="button"
              onClick={continueToNextStep}
              className="button-primary"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={completeFlow}
              disabled={
                !form.acceptsReturnPolicy ||
                !form.acceptsRefundRules ||
                !form.acceptsQualityGuidelines
              }
              className="button-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Go Live
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function RegistrationStep({ form, updateField }: { form: SellerOnboardingState; updateField: UpdateField }) {
  return (
    <div>
      <h2 className="font-display text-4xl text-royal">Seller registration</h2>
      <p className="mt-2 text-sm text-royal/65">
        Capture the basic seller account details. OTP is a visual-only field in this demo.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <SellerField id="seller-name" label="Full name" value={form.fullName} onChange={(value) => updateField("fullName", value)} required />
        <SellerField id="seller-email" label="Email" value={form.email} type="email" onChange={(value) => updateField("email", value)} required />
        <div>
          <SellerField id="seller-phone" label="Phone number" value={form.phone} onChange={(value) => updateField("phone", value)} placeholder="+91 98765 43210" required />
          <button type="button" className="mt-2 rounded-full bg-royal/5 px-4 py-2 text-xs font-semibold text-royal">
            Send OTP UI
          </button>
        </div>
        <SellerField id="seller-otp" label="OTP code" value={form.otp} onChange={(value) => updateField("otp", value)} placeholder="123456" />
        <SellerField id="seller-password" label="Password" value={form.password} type="password" onChange={(value) => updateField("password", value)} required />
        <label htmlFor="business-type" className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-royal/55">
            Business type
          </span>
          <select
            id="business-type"
            value={form.businessType}
            onChange={(event) =>
              updateField("businessType", event.target.value as SellerOnboardingState["businessType"])
            }
            className="mt-2 w-full rounded-[18px] border border-royal/10 bg-white px-4 py-3 text-sm text-royal outline-none"
          >
            <option>Individual</option>
            <option>Small business</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function VerificationStep({
  form,
  updateField,
  updateFileName
}: {
  form: SellerOnboardingState;
  updateField: UpdateField;
  updateFileName: (key: "governmentIdFile" | "profileImage", event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-4xl text-royal">Identity verification</h2>
      <p className="mt-2 text-sm text-royal/65">
        These fields are frontend-only placeholders for Aadhaar/PAN, bank, and pickup details.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <SellerUploadField
          label="Government ID: Aadhaar/PAN"
          value={form.governmentIdFile}
          onChange={(event) => updateFileName("governmentIdFile", event)}
        />
        <SellerField id="bank-name" label="Bank account holder" value={form.bankName} onChange={(value) => updateField("bankName", value)} />
        <SellerField id="account-number" label="Bank account number" value={form.accountNumber} onChange={(value) => updateField("accountNumber", value)} />
        <SellerField id="ifsc" label="IFSC" value={form.ifsc} onChange={(value) => updateField("ifsc", value.toUpperCase())} />
        <div className="md:col-span-2">
          <SellerTextArea
            id="pickup-address"
            label="Pickup/return address"
            value={form.pickupAddress}
            onChange={(value) => updateField("pickupAddress", value)}
            placeholder="House, street, city, state, pincode"
          />
        </div>
        <SellerField id="portfolio" label="Social media or portfolio link" value={form.portfolioLink} onChange={(value) => updateField("portfolioLink", value)} placeholder="https://instagram.com/yourshop" />
      </div>
    </div>
  );
}

function ProfileStep({
  form,
  updateField,
  updateFileName,
  toggleTag
}: {
  form: SellerOnboardingState;
  updateField: UpdateField;
  updateFileName: (key: "governmentIdFile" | "profileImage", event: ChangeEvent<HTMLInputElement>) => void;
  toggleTag: (tag: string) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-4xl text-royal">Seller profile setup</h2>
      <p className="mt-2 text-sm text-royal/65">
        Shape the public-facing shop identity buyers will see.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <SellerField id="shop-name" label="Shop name" value={form.shopName} onChange={(value) => updateField("shopName", value)} required />
        <SellerField id="shop-location" label="Location" value={form.location} onChange={(value) => updateField("location", value)} placeholder="Jaipur, Rajasthan" />
        <SellerUploadField
          label="Profile image"
          value={form.profileImage}
          onChange={(event) => updateFileName("profileImage", event)}
        />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-royal/55">
            Specialization tags
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {specializationTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  form.tags.includes(tag) ? "bg-royal text-white" : "bg-white text-royal"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <SellerTextArea id="shop-bio" label="Bio/description" value={form.bio} onChange={(value) => updateField("bio", value)} placeholder="Tell buyers about your craft, materials, and custom work." />
        </div>
      </div>
    </div>
  );
}

function ProductStep({
  form,
  updateField,
  updateProductImages,
  errors
}: {
  form: SellerOnboardingState;
  updateField: UpdateField;
  updateProductImages: (event: ChangeEvent<HTMLInputElement>) => void;
  errors: ProductValidationErrors;
}) {
  return (
    <div>
      <h2 className="font-display text-4xl text-royal">First product listing</h2>
      <p className="mt-2 text-sm text-royal/65">
        Create a demo listing so the seller dashboard starts with a real product row.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div>
          <SellerField id="product-title" label="Product title" value={form.productTitle} onChange={(value) => updateField("productTitle", value)} required />
          {errors.title ? <InlineError message={errors.title} /> : null}
        </div>
        <label htmlFor="product-category" className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-royal/55">Category</span>
          <select
            id="product-category"
            value={form.productCategory}
            onChange={(event) => updateField("productCategory", event.target.value)}
            className="mt-2 w-full rounded-[18px] border border-royal/10 bg-white px-4 py-3 text-sm text-royal outline-none"
          >
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category}>{category}</option>
            ))}
            <option>Home Decor</option>
            <option>Accessories</option>
          </select>
          {errors.category ? <InlineError message={errors.category} /> : null}
        </label>
        <div>
          <SellerField id="product-price" label="Price" type="number" value={form.productPrice} onChange={(value) => updateField("productPrice", value)} placeholder="2490" required />
          {errors.price ? <InlineError message={errors.price} /> : null}
        </div>
        <SellerField id="product-quantity" label="Quantity" type="number" value={form.productQuantity} onChange={(value) => updateField("productQuantity", value)} placeholder="5" required />
        <SellerField id="variant-size" label="Variants: size" value={form.variantSizes} onChange={(value) => updateField("variantSizes", value)} placeholder="S, M, L or Mini, Classic" />
        <SellerField id="variant-color" label="Variants: color" value={form.variantColors} onChange={(value) => updateField("variantColors", value)} placeholder="Ivory, Blush, Sage" />
        <label className="flex items-center gap-3 rounded-[18px] border border-royal/10 bg-white px-4 py-3 text-sm font-semibold text-royal">
          <input
            type="checkbox"
            checked={form.customizable}
            onChange={(event) => updateField("customizable", event.target.checked)}
          />
          Customizable product
        </label>
        <label htmlFor="material-used" className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-royal/55">Material used</span>
          <select
            id="material-used"
            value={form.material}
            onChange={(event) => updateField("material", event.target.value)}
            className="mt-2 w-full rounded-[18px] border border-royal/10 bg-white px-4 py-3 text-sm text-royal outline-none"
          >
            {MATERIAL_OPTIONS.map((material) => (
              <option key={material}>{material}</option>
            ))}
          </select>
        </label>
        <SellerField id="time-to-make" label="Time to make" value={form.timeToMake} onChange={(value) => updateField("timeToMake", value)} placeholder="3 to 5 days" />
        <SellerField id="custom-options" label="Customization options" value={form.customizationOptions} onChange={(value) => updateField("customizationOptions", value)} placeholder="Name embroidery, color changes" />
        <div className="md:col-span-2">
          <SellerUploadField
            label="Multiple product images"
            multiple
            value={form.productImages.length ? `${form.productImages.length} image(s) selected` : ""}
            onChange={updateProductImages}
          />
          {errors.images ? <InlineError message={errors.images} /> : null}
        </div>
        <div className="md:col-span-2">
          <SellerTextArea id="product-description" label="Description" value={form.productDescription} onChange={(value) => updateField("productDescription", value)} placeholder="Describe the stitch, texture, use case, and care instructions." />
        </div>
      </div>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return <p className="mt-2 text-sm font-semibold text-rose-700">{message}</p>;
}

function ShippingStep({ form, updateField }: { form: SellerOnboardingState; updateField: UpdateField }) {
  return (
    <div>
      <h2 className="font-display text-4xl text-royal">Shipping setup</h2>
      <p className="mt-2 text-sm text-royal/65">
        Set dispatch timing, charges, and regions for the demo listing.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <SellerField id="dispatch-time" label="Dispatch time" value={form.dispatchTime} onChange={(value) => updateField("dispatchTime", value)} placeholder="2 to 4 days" />
        <SellerField id="shipping-charges" label="Shipping charges" type="number" value={form.shippingCharges} onChange={(value) => updateField("shippingCharges", value)} placeholder="99" />
        <SellerField id="delivery-regions" label="Delivery regions" value={form.deliveryRegions} onChange={(value) => updateField("deliveryRegions", value)} placeholder="India, metro cities" />
      </div>
    </div>
  );
}

function PoliciesStep({ form, updateField }: { form: SellerOnboardingState; updateField: UpdateField }) {
  return (
    <div>
      <h2 className="font-display text-4xl text-royal">Policies agreement</h2>
      <p className="mt-2 text-sm text-royal/65">
        Accept the marketplace guardrails before the demo shop goes live.
      </p>
      <div className="mt-8 grid gap-4">
        <PolicyCheckbox
          label="I accept the return policy."
          checked={form.acceptsReturnPolicy}
          onChange={(checked) => updateField("acceptsReturnPolicy", checked)}
        />
        <PolicyCheckbox
          label="I accept the refund rules."
          checked={form.acceptsRefundRules}
          onChange={(checked) => updateField("acceptsRefundRules", checked)}
        />
        <PolicyCheckbox
          label="I accept the handmade quality guidelines."
          checked={form.acceptsQualityGuidelines}
          onChange={(checked) => updateField("acceptsQualityGuidelines", checked)}
        />
      </div>
    </div>
  );
}

function PolicyCheckbox({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-[20px] border border-royal/10 bg-white px-5 py-4 text-sm font-semibold text-royal">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
