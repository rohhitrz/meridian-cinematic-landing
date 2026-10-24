import { notFound } from "next/navigation";
import { LabCanvas } from "./LabCanvas";
import { LAB_SCENES } from "./scenes";

export const metadata = { robots: { index: false, follow: false } };

// Internal: renders one scene full-viewport for visual tuning and still capture.
// /lab/<scene>?p=0.5&t=3  (p = scroll progress, t = frozen time in seconds)
export default async function LabPage({ params }: { params: Promise<{ scene: string }> }) {
  const { scene } = await params;
  if (!LAB_SCENES.includes(scene)) notFound();
  return <LabCanvas scene={scene} />;
}
