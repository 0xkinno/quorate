"use client";
import dynamic from "next/dynamic";
import type { TimelineMember } from "./HonorTimeline";

const HonorTimeline = dynamic(() => import("./HonorTimeline"), { ssr: false, loading: () => <p className="empty">Loading the timeline</p> });

export function TimelineLoader(props: { members: TimelineMember[]; closeAt: string; title: string }) {
  return <HonorTimeline {...props} />;
}
