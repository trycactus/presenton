"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Button } from "./ui/button";
import { PresentationGenerationApi } from "@/app/(presentation-generator)/services/api/presentation-generation";
import { RootState } from "@/store/store";

interface CactusContext {
  quickAnalysisId: string;
  token: string;
  organizationId: string;
  origin: string;
}

interface EmbeddedModeProps {
  data: {
    prompt: string;
    deckType: string;
    slideCount: number;
  };
  cactusContext: CactusContext | null;
}

export default function EmbeddedMode({
  data,
  cactusContext,
}: EmbeddedModeProps) {
  const [currentStep, setCurrentStep] = useState("setup");
  const [presentationId, setPresentationId] = useState<string | null>(null);

  const { presentationData, isStreaming } = useSelector(
    (state: RootState) => state.presentationGeneration
  );

  console.log("EmbeddedMode component rendered with data:", data);
  console.log("Current step:", currentStep);
  console.log("Current URL:", window.location.href);
  console.log("Redux presentationData:", presentationData);
  console.log("Redux isStreaming:", isStreaming);

  // Ensure we still create reference even if component navigates away
  const [referenceSent, setReferenceSent] = useState(false);

  const presentationIdFromRedux = useSelector(
    (state: RootState) => state.presentationGeneration.presentation_id
  );

  useEffect(() => {
    if (!referenceSent && cactusContext && presentationIdFromRedux) {
      console.log(
        "Detected presentation_id in redux state",
        presentationIdFromRedux
      );
      setReferenceSent(true);
      createCactusPresentationReference(
        presentationIdFromRedux,
        cactusContext
      ).catch((err) =>
        console.error(
          "Failed to send presentation reference to Cactus API (redux watcher)",
          err
        )
      );
    }
  }, [presentationIdFromRedux, cactusContext, referenceSent]);

  // Check if we're being redirected
  useEffect(() => {
    const handleUrlChange = () => {
      console.log("URL changed to:", window.location.href);
    };

    // Listen for popstate events (back/forward)
    window.addEventListener("popstate", handleUrlChange);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, []);

  const handlePresentationComplete = (id: string) => {
    setPresentationId(id);

    console.log("handlePresentationComplete invoked with id", id);
    console.log("cactusContext at complete", cactusContext);

    // Notify parent window that presentation was created
    window.parent.postMessage(
      {
        type: "PRESENTATION_CREATED",
        presentationId: id,
      },
      "*"
    );

    // If cactus context is available, create reference record back to CACTUS API
    if (cactusContext) {
      console.log("Calling createCactusPresentationReference...");
      createCactusPresentationReference(id, cactusContext).catch((err) =>
        console.error(
          "Failed to send presentation reference to Cactus API",
          err
        )
      );
    }
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
              onStart={() => {
                console.log("Transitioning from setup to generating step");
                setCurrentStep("generating");
              }}
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

async function createCactusPresentationReference(
  presentationId: string,
  { quickAnalysisId, token, organizationId, origin }: CactusContext
) {
  const CACTUS_API_URL =
    process.env.NEXT_PUBLIC_CACTUS_API_URL || "http://localhost:8080";

  const presentationRef = {
    presenton_id: presentationId,
    document_type: "PRESENTATION", // adjust if you have actual doc type
    title: "Presenton Presentation", // title is unknown; left placeholder
    created_at: new Date().toISOString(),
  };

  await fetch(
    `${CACTUS_API_URL}/quick-analyses/${quickAnalysisId}/presentations/reference`,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Origin: origin,
        "X-Organization-Id": organizationId,
      },
      body: JSON.stringify(presentationRef),
    }
  ).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cactus API responded ${res.status}: ${text}`);
    }
    console.log("Cactus presentation reference saved successfully");
  });
}

function PresentationSetup({
  data,
  onStart,
}: {
  data: any;
  onStart: () => void;
}) {
  const handleStartClick = () => {
    console.log("Generate Presentation button clicked in PresentationSetup");
    onStart();
  };
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
        <Button onClick={handleStartClick} size="lg">
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generatePresentation = async () => {
      try {
        console.log("Starting presentation generation with data:", data);
        setStatus("Creating presentation...");
        setProgress(20);

        setProgress(40);
        setStatus("Generating slides...");

        console.log(
          "About to call PresentationGenerationApi.createPresentation"
        );
        const createResponse =
          await PresentationGenerationApi.createPresentation({
            prompt: data.prompt,
            n_slides: data.slideCount,
            file_paths: [],
            language: "English",
          });

        console.log("PRESENTATION_CREATED", createResponse);

        setProgress(80);
        setStatus("Finalizing...");

        setProgress(100);
        setStatus("Complete!");
        if (createResponse?.id) {
          onComplete(createResponse.id);
        } else {
          throw new Error("Presentation ID missing in response");
        }
      } catch (error) {
        console.error("Error generating presentation:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          error,
        });
        setError(
          error instanceof Error
            ? error.message
            : "Failed to generate presentation"
        );
        setStatus("Error occurred");

        // Notify parent of error
        window.parent.postMessage(
          {
            type: "PRESENTATION_ERROR",
            error:
              error instanceof Error
                ? error.message
                : "Failed to generate presentation",
          },
          "*"
        );
      }
    };

    generatePresentation();
  }, [data, onComplete]);

  if (error) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-red-600">
          <h2 className="text-lg font-semibold mb-3">Generation Failed</h2>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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

      <div className="text-gray-500">
        <p>AI is analyzing your property data and creating slides...</p>
        {progress > 50 && <p className="mt-2">Almost there...</p>}
      </div>
    </div>
  );
}
