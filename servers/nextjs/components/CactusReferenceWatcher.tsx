"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface CactusContext {
  quickAnalysisId: string;
  token: string;
  organizationId: string;
  origin: string;
}

export default function CactusReferenceWatcher() {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    console.log("🌵 CactusReferenceWatcher component mounted and ready!");
  }, []);
  
  const presentationId = useSelector(
    (state: RootState) => state.presentationGeneration.presentation_id
  );
  console.log("🌵 CactusReferenceWatcher presentation_id from Redux:", presentationId, "isMounted:", isMounted);
  const [sentForId, setSentForId] = useState<string | null>(null);

  // Add debugging to see when the presentation ID changes
  useEffect(() => {
    if (isMounted) {
      console.log("🌵 Presentation ID changed:", presentationId);
    }
  }, [presentationId, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    
    console.log("CactusReferenceWatcher useEffect triggered", {
      presentationId,
      sentForId,
      hasMatch: sentForId === presentationId
    });
    
    if (!presentationId || sentForId === presentationId) return;

    const raw = localStorage.getItem("presenton_cactus_context");
    console.log("Raw cactus context from localStorage:", raw);
    if (!raw) {
      console.log("No cactus context found in localStorage");
      return;
    }

    try {
      const cactusContext: CactusContext = JSON.parse(raw);
      if (
        !cactusContext?.quickAnalysisId ||
        !cactusContext.token ||
        !cactusContext.organizationId
      ) {
        return;
      }

      const run = async () => {
        const CACTUS_API_URL =
          process.env.NEXT_PUBLIC_CACTUS_API_URL || "http://localhost:8080";

        const presentationRef = {
          presenton_id: presentationId,
          document_type: "PRESENTATION",
          title: "Presenton Presentation",
          created_at: new Date().toISOString(),
        };

        const apiUrl = `${CACTUS_API_URL}/quick-analyses/${cactusContext.quickAnalysisId}/presentations/reference`;
        console.log("Making Cactus API call to:", apiUrl);
        console.log("Request payload:", presentationRef);
        console.log("Request headers:", {
          Authorization: `Bearer ${cactusContext.token}`,
          Origin: cactusContext.origin,
          "X-Organization-Id": cactusContext.organizationId,
        });

        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            Authorization: `Bearer ${cactusContext.token}`,
            Origin: cactusContext.origin,
            "X-Organization-Id": cactusContext.organizationId,
          },
          body: JSON.stringify(presentationRef),
        });
        if (!res.ok) {
          console.error(
            "Cactus reference API failed",
            res.status,
            await res.text()
          );
          return;
        }
        console.log("Cactus presentation reference saved globally");
        setSentForId(presentationId);
      };

      run();
    } catch (e) {
      console.error("Failed to parse cactus context", e);
    }
  }, [presentationId, sentForId, isMounted]);

  return null;
}
