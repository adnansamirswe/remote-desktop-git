"use client";

import { Suspense } from "react";
import ViewerContent from "./ViewerContent";

export default function ViewerPage() {
  return (
    <Suspense fallback={<ViewerLoadingFallback />}>
      <ViewerContent />
    </Suspense>
  );
}

function ViewerLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent align-[-0.125em]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
        <p className="mt-4 text-lg font-medium">Connecting to host...</p>
      </div>
    </div>
  );
}
