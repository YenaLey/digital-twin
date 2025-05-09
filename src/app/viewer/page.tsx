import { Suspense } from "react";
import ViewerClient from "./ViewerClient";

export default function ViewerPage() {
  return (
    <Suspense fallback={<div>Loading viewer...</div>}>
      <ViewerClient />
    </Suspense>
  );
}
