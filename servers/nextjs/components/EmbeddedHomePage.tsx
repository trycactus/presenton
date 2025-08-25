"use client";

import { useEffect, useState } from "react";
import EmbeddedMode from "@/components/EmbeddedMode";
import Home from "@/components/Home";

interface FormattedQAData {
  prompt: string;
  deckType: string;
  slideCount: number;
}

interface CactusContext {
  quickAnalysisId: string;
  token: string;
  organizationId: string;
  origin: string;
}

export default function EmbeddedHomePage() {
  console.log("🏠 EmbeddedHomePage component rendering");
  console.log("🏠 Current URL:", typeof window !== 'undefined' ? window.location.href : 'SSR');
  
  const [embeddedData, setEmbeddedData] = useState<FormattedQAData | null>(
    null
  );
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [cactusContext, setCactusContext] = useState<CactusContext | null>(
    null
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const embedded = urlParams.get("embedded") === "true";

    console.log("EmbeddedHomePage useEffect - URL params check:", {
      embedded,
      fullUrl: window.location.href,
      searchParams: window.location.search
    });

    if (embedded) {
      setIsEmbedded(true);
      console.log("Setting isEmbedded to true");

      const qaId = urlParams.get("qaId");
      const deckType = urlParams.get("deckType");
      const origin = decodeURIComponent(urlParams.get("origin") || "");
      const token = urlParams.get("token");
      const organizationId = urlParams.get("organizationId");

      console.log("Extracted URL parameters:", {
        qaId, deckType, origin, token, organizationId
      });

      if (
        qaId &&
        deckType &&
        token &&
        organizationId &&
        isAllowedOrigin(origin)
      ) {
        // store context for later reference update
        const contextData = {
          quickAnalysisId: qaId,
          token,
          organizationId,
          origin,
        };
        setCactusContext(contextData);
        
        // CRITICAL: Store in localStorage so CactusReferenceWatcher can find it
        localStorage.setItem("presenton_cactus_context", JSON.stringify(contextData));
        console.log("Stored cactus context in localStorage:", contextData);
        
        fetchQAData(qaId, deckType, origin, token, organizationId)
          .then((data) => {
            const formattedData = formatQADataForPresenton(data, deckType);
            setEmbeddedData(formattedData);
            
            // ALSO store the embedded data in localStorage for the upload page
            localStorage.setItem("presenton_embedded_data", JSON.stringify(formattedData));
            console.log("Stored embedded data in localStorage:", formattedData);

            // Notify parent that embed is ready
            window.parent.postMessage({ type: "EMBED_READY" }, origin);
          })
          .catch((error) => {
            console.error("Failed to fetch QA data:", error);
            window.parent.postMessage(
              {
                type: "EMBED_ERROR",
                error: (error as Error).message,
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
    return <EmbeddedMode data={embeddedData} cactusContext={cactusContext} />;
  }

  return <Home />;
}

function isAllowedOrigin(origin: string): boolean {
  const allowed = [
    "http://localhost:3000",
    "https://trycactus.com",
    // Add your production domains here
  ];
  return allowed.some((allowedOrigin) => origin.startsWith(allowedOrigin));
}

async function fetchQAData(
  qaId: string,
  deckType: string,
  origin: string,
  token: string,
  organizationId: string
) {
  const CACTUS_API_URL =
    process.env.NEXT_PUBLIC_CACTUS_API_URL || "http://localhost:8080";

  const response = await fetch(`${CACTUS_API_URL}/quick-analyses/${qaId}`, {
    headers: {
      Accept: "application/json, text/plain, */*",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Origin: origin,
      "X-Organization-Id": organizationId,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch quick analysis data");
  }

  return response.json();
}

function formatQADataForPresenton(qaData: any, deckType: string) {
  // Build comprehensive prompt from QA data
  let prompt = `Create a professional ${deckType.toLowerCase()} presentation for real estate investment`;

  // Add market analysis @TODO
  if (qaData.market_analysis) {
    const market = qaData.market_analysis;
    if (market.neighborhood) prompt += `. Market: ${market.neighborhood}`;
    if (market.median_home_price)
      prompt += `. Median Home Price: $${market.median_home_price.toLocaleString()}`;
    if (market.price_per_sq_ft)
      prompt += `. Price per sq ft: $${market.price_per_sq_ft}`;
  }

  prompt += `. Use the provided property and financial data to create specific, data-driven content with actual numbers and metrics rather than generic placeholders.\n\n`;

  // Deep clone to avoid mutating the original object
  const sanitizedQAData = JSON.parse(JSON.stringify(qaData));

  if (sanitizedQAData?.overview) {
    delete sanitizedQAData.overview.profitabilityGraphsWithIncludeSale;
    delete sanitizedQAData.overview.profitabilityGraphsWithExcludeSale;
  }

  // Append full QA JSON for richer context
  const qaJsonString = JSON.stringify(sanitizedQAData, null, 2);
  prompt += `Here is the full QA data in JSON:\n${qaJsonString}`;

  return {
    prompt,
    deckType,
    slideCount: getSlideCountForDeckType(deckType),
  } as FormattedQAData;
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
