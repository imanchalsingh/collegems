import React from "react";
import { Milestone } from "../../../types/milestone";
import TimelineCard from "./TimelineCard";
import TimelineEmpty from "./TimelineEmpty";

interface TimelineProps {
  milestones: Milestone[];
  onClearFilters?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({ milestones, onClearFilters }) => {
  if (milestones.length === 0) {
    return <TimelineEmpty onClearFilters={onClearFilters} />;
  }

  return (
    <div className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-4 pl-0 py-2 space-y-6">
      {milestones.map((milestone) => (
        <TimelineCard key={milestone.id} milestone={milestone} />
      ))}
    </div>
  );
};
export default Timeline;
