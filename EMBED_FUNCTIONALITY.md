In your forked Presenton repository at `/Users/nerf/presenton`:

```tsx
// servers/nextjs/app/page.tsx - Add embedded mode detection
"use client";

import { useEffect, useState } from "react";
import EmbeddedMode from "@/components/EmbeddedMode";
import Home from "@/components/Home";

// servers/nextjs/app/page.tsx - Add embedded mode detection

export default function HomePage() {
  const [embeddedData, setEmbeddedData] = useState(null);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const embedded = urlParams.get("embedded") === "true";

    if (embedded) {
      setIsEmbedded(true);

      const qaId = urlParams.get("qaId");
      const deckType = urlParams.get("deckType");
      const origin = decodeURIComponent(urlParams.get("origin") || "");

      if (qaId && deckType && isAllowedOrigin(origin)) {
        fetchQAData(qaId, deckType, origin)
          .then((data) => {
            const formattedData = formatQADataForPresenton(data, deckType);
            setEmbeddedData(formattedData);

            // Notify parent that embed is ready
            window.parent.postMessage({ type: "EMBED_READY" }, origin);
          })
          .catch((error) => {
            console.error("Failed to fetch QA data:", error);
            window.parent.postMessage(
              {
                type: "EMBED_ERROR",
                error: error.message,
              },
              origin
            );
          });
      }
    }
  }, []);

  if (isEmbedded) {
    if (!embeddedData) {
      return (
        <div className="flex items-center justify-center h-screen">
          Loading...
        </div>
      );
    }
    return <EmbeddedMode data={embeddedData} />;
  }

  return <Home />;
}

function isAllowedOrigin(origin: string): boolean {
  const allowed = ["http://localhost:3000", "https://trycactus.com"];
  return allowed.some((allowedOrigin) => origin.startsWith(allowedOrigin));
}

async function fetchQAData(qaId: string, deckType: string, origin: string) {
  const CACTUS_API_URL =
    process.env.NEXT_PUBLIC_CACTUS_API_URL || "http://localhost:8080";

  const response = await fetch(
    `${CACTUS_API_URL}/api/v1/quick-analyses/${qaId}`,
    {
      headers: {
        Origin: origin,
        "X-Requested-For": "presenton-embed",
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch quick analysis data");
  }

  return response.json();
}

function formatQADataForPresenton(qaData: any, deckType: string) {
  // Build comprehensive prompt from QA data
  let prompt = `Create a professional ${deckType.toLowerCase()} presentation for real estate investment`;

  // Add property details
  if (qaData.property_details) {
    const property = qaData.property_details;
    if (property.address) prompt += `. Property: ${property.address}`;
    if (property.property_type)
      prompt += `. Property Type: ${property.property_type}`;
    if (property.square_footage)
      prompt += `. Size: ${property.square_footage.toLocaleString()} sq ft`;
    if (property.year_built) prompt += `. Built: ${property.year_built}`;
  }

  // Add financial highlights
  if (qaData.financial_analysis) {
    const financial = qaData.financial_analysis;
    if (financial.purchase_price)
      prompt += `. Purchase Price: $${financial.purchase_price.toLocaleString()}`;
    if (financial.estimated_monthly_rent)
      prompt += `. Monthly Rent: $${financial.estimated_monthly_rent.toLocaleString()}`;
    if (financial.cap_rate) prompt += `. Cap Rate: ${financial.cap_rate}%`;
    if (financial.cash_on_cash_return)
      prompt += `. Cash-on-Cash Return: ${financial.cash_on_cash_return}%`;
    if (financial.total_roi) prompt += `. Total ROI: ${financial.total_roi}%`;
  }

  // Add market analysis
  if (qaData.market_analysis) {
    const market = qaData.market_analysis;
    if (market.neighborhood) prompt += `. Market: ${market.neighborhood}`;
    if (market.median_home_price)
      prompt += `. Median Home Price: $${market.median_home_price.toLocaleString()}`;
    if (market.price_per_sq_ft)
      prompt += `. Price per sq ft: $${market.price_per_sq_ft}`;
  }

  // Add investment summary
  if (qaData.investment_summary) {
    const summary = qaData.investment_summary;
    if (summary.recommendation)
      prompt += `. Investment Recommendation: ${summary.recommendation}`;
    if (summary.key_highlights?.length > 0)
      prompt += `. Key Highlights: ${summary.key_highlights.join(", ")}`;
    if (summary.risk_factors?.length > 0)
      prompt += `. Risk Factors: ${summary.risk_factors.join(", ")}`;
  }

  prompt += `. Use the provided property and financial data to create specific, data-driven content with actual numbers and metrics rather than generic placeholders.`;

  return {
    prompt,
    deckType,
    slideCount: getSlideCountForDeckType(deckType),
    qaData,
  };
}

function getSlideCountForDeckType(deckType: string): number {
  const slideMap: Record<string, number> = {
    "Investor Deck": 20,
    "Financing Package": 15,
    "Offering Memorandum": 25,
    "Project Summary": 10,
  };
  return slideMap[deckType] || 10;
}
```

#### Step 8: Create EmbeddedMode Component

```tsx
// servers/nextjs/components/EmbeddedMode.tsx
"use client";

import { useState } from "react";
import { Button } from "./ui/button";

// servers/nextjs/components/EmbeddedMode.tsx

interface EmbeddedModeProps {
  data: {
    prompt: string;
    deckType: string;
    slideCount: number;
    qaData: any;
  };
}

export default function EmbeddedMode({ data }: EmbeddedModeProps) {
  const [currentStep, setCurrentStep] = useState("setup");
  const [presentationId, setPresentationId] = useState<string | null>(null);

  const handlePresentationComplete = (id: string) => {
    setPresentationId(id);

    // Notify parent window that presentation was created
    window.parent.postMessage(
      {
        type: "PRESENTATION_CREATED",
        presentationId: id,
      },
      "*"
    );
  };

  return (
    <div className="embedded-mode h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            Create {data.deckType}
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered presentation generation from your property analysis
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === "setup"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              1
            </div>
            <div className="flex-1 h-0.5 bg-gray-200">
              <div
                className={`h-full bg-blue-600 transition-all ${
                  currentStep !== "setup" ? "w-full" : "w-0"
                }`}
              />
            </div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === "generating"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              2
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Setup</span>
            <span>Generating</span>
          </div>
        </div>

        {/* Content based on current step */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          {currentStep === "setup" && (
            <PresentationSetup
              data={data}
              onStart={() => setCurrentStep("generating")}
            />
          )}

          {currentStep === "generating" && (
            <PresentationGenerator
              data={data}
              onComplete={handlePresentationComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PresentationSetup({
  data,
  onStart,
}: {
  data: any;
  onStart: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-3">Presentation Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Type:</span>
            <span className="ml-2 font-medium">{data.deckType}</span>
          </div>
          <div>
            <span className="text-gray-600">Slides:</span>
            <span className="ml-2 font-medium">{data.slideCount}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Generated Prompt:</h3>
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 max-h-32 overflow-y-auto">
          {data.prompt}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onStart} size="lg">
          Generate Presentation
        </Button>
      </div>
    </div>
  );
}

function PresentationGenerator({
  data,
  onComplete,
}: {
  data: any;
  onComplete: (id: string) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Starting...");

  // Integrate with existing Presenton generation logic
  // This would use your existing presentation generation flow
  // For now, this is a placeholder that simulates the process

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Generating Your Presentation
        </h2>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-600 mt-2">{status}</p>
      </div>

      {/* This would integrate with your actual generation UI */}
      <div className="text-gray-500">
        <p>AI is analyzing your property data and creating slides...</p>
      </div>
    </div>
  );
}
```
