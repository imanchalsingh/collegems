import { useState } from "react";
import { Trophy, Medal, Award, Star, Code, BookOpen, Globe, Dumbbell, Palette, Sparkles, ChevronRight, Music } from "lucide-react";

// Types 
interface Achievement {
  id: number;
  title: string;
  student: string;
  category: string;
  year: string;
  description: string;
  rank: "gold" | "silver" | "bronze" | "special";
}

// Mock Data 
// TODO: Replace mock achievement data with API response from /achievements endpoint
// TODO: Fetch only approved achievements from the database
const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 1,
    title: "Hackathon Winner",
    student: "Student1",
    category: "Coding",
    year: "2025",
    description: "Won 1st place in inter-college hackathon with an AI-powered campus navigation app.",
    rank: "gold",
  },
  {
    id: 2,
    title: "Best Innovation Project",
    student: "Student2",
    category: "Innovation",
    year: "2025",
    description: "Secured 2nd rank in the Best Innovation Project representing the state.",
    rank: "silver",
  },
  {
    id: 3,
    title: "Best Research Paper",
    student: "Student3",
    category: "Research",
    year: "2024",
    description: "Published and presented research on renewable energy at IIT Tech Symposium.",
    rank: "special",
  },
  {
    id: 4,
    title: "Inter-College Debate Champion",
    student: "Student4",
    category: "Debate",
    year: "2025",
    description: "First place at the All-India Inter-College Debate Championship.",
    rank: "gold",
  },
  {
    id: 5,
    title: "State Athletics Gold",
    student: "Student5",
    category: "Sports",
    year: "2024",
    description: "Won gold medal in 400m sprint at the State University Athletics Meet.",
    rank: "gold",
  },
  {
    id: 6,
    title: "Cultural Fest Best Performer",
    student: "Student6",
    category: "Arts",
    year: "2025",
    description: "Best solo dance performance at the National Cultural Festival.",
    rank: "bronze",
  },
  {
    id: 7,
    title: "Classical Music Competition",
    student: "Student7",
    category: "Music",
    year: "2024",
    description: "Won state-level classical music competition in the instrumental category.",
    rank: "silver",
  },
];

// Category Config - FIXED with dark mode classes
const CATEGORY_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    bgClass: string;
    tagBg: string;
    tagText: string;
  }
> = {
  Coding: {
    icon: Code,
    iconClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-900/30",
    tagBg: "bg-blue-50 dark:bg-blue-900/30",
    tagText: "text-blue-700 dark:text-blue-300",
  },
  Innovation: {
    icon: BookOpen,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/30",
    tagBg: "bg-emerald-50 dark:bg-emerald-900/30",
    tagText: "text-emerald-700 dark:text-emerald-300",
  },
  Research: {
    icon: Globe,
    iconClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-900/30",
    tagBg: "bg-purple-50 dark:bg-purple-900/30",
    tagText: "text-purple-700 dark:text-purple-300",
  },
  Debate: {
    icon: Sparkles,
    iconClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-900/30",
    tagBg: "bg-amber-50 dark:bg-amber-900/30",
    tagText: "text-amber-700 dark:text-amber-300",
  },
  Sports: {
    icon: Dumbbell,
    iconClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-900/30",
    tagBg: "bg-rose-50 dark:bg-rose-900/30",
    tagText: "text-rose-700 dark:text-rose-300",
  },
  Arts: {
    icon: Palette,
    iconClass: "text-pink-600 dark:text-pink-400",
    bgClass: "bg-pink-50 dark:bg-pink-900/30",
    tagBg: "bg-pink-50 dark:bg-pink-900/30",
    tagText: "text-pink-700 dark:text-pink-300",
  },
  Music: {
    icon: Music,
    iconClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-900/30",
    tagBg: "bg-indigo-50 dark:bg-indigo-900/30",
    tagText: "text-indigo-700 dark:text-indigo-300",
  },
};

const DEFAULT_CATEGORY = {
  icon: Star,
  iconClass: "text-gray-500 dark:text-gray-400",
  bgClass: "bg-gray-50 dark:bg-gray-800",
  tagBg: "bg-gray-50 dark:bg-gray-800",
  tagText: "text-gray-700 dark:text-gray-300",
};

// Rank Config - FIXED with dark mode classes
const RANK_CONFIG = {
  gold: {
    label: "1st Place",
    badgeClass: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: Trophy,
    iconClass: "text-amber-500 dark:text-amber-400",
  },
  silver: {
    label: "2nd Place",
    badgeClass: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    icon: Medal,
    iconClass: "text-slate-400 dark:text-slate-500",
  },
  bronze: {
    label: "3rd Place",
    badgeClass: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    icon: Medal,
    iconClass: "text-orange-400 dark:text-orange-400",
  },
  special: {
    label: "Special",
    badgeClass: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: Award,
    iconClass: "text-blue-500 dark:text-blue-400",
  },
};

// Rank Badge 
function RankBadge({ rank }: { rank: Achievement["rank"] }) {
  const cfg = RANK_CONFIG[rank];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badgeClass}`}
    >
      <Icon className={`w-3.5 h-3.5 ${cfg.iconClass}`} />
      {cfg.label}
    </span>
  );
}

// Achievement Card - FIXED
function AchievementCard({ achievement }: { achievement: Achievement }) {
  const cat = CATEGORY_CONFIG[achievement.category] ?? DEFAULT_CATEGORY;
  const Icon = cat.icon;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow flex flex-col gap-3">
      {/* Top row: category icon + rank badge */}
      <div className="flex items-start justify-between gap-2">
        <div className={`p-2.5 rounded-lg ${cat.bgClass} flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${cat.iconClass}`} />
        </div>
        <RankBadge rank={achievement.rank} />
      </div>

      {/* Title + description */}
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-white leading-snug">
          {achievement.title}
        </h3>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
          {achievement.description}
        </p>
      </div>

      {/* Footer: student info + category tag */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {achievement.student}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{achievement.year}</p>
        </div>
        <span
          className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${cat.tagBg} ${cat.tagText}`}
        >
          {achievement.category}
        </span>
      </div>
    </div>
  );
}

// Empty State - FIXED
function EmptyState({ category }: { category: string }) {
  return (
    <div className="py-14 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Trophy className="w-7 h-7 text-gray-300 dark:text-gray-600" />
      </div>
      <p className="text-gray-500 dark:text-gray-400 font-medium">No achievements found</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
        {category === "All"
          ? "No achievements have been added yet."
          : `No achievements in the "${category}" category.`}
      </p>
    </div>
  );
}

// Main Component 
const ALL_CATEGORIES = [
  "All",
  ...Array.from(new Set(MOCK_ACHIEVEMENTS.map((a) => a.category))),
];

export default function StudentAchievements() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [showAll, setShowAll] = useState(false);

  const filtered =
    activeCategory === "All"
      ? MOCK_ACHIEVEMENTS
      : MOCK_ACHIEVEMENTS.filter((a) => a.category === activeCategory);

  const displayed = showAll ? filtered : filtered.slice(0, 3);
  const hasMore = filtered.length > 3;

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setShowAll(false);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - FIXED */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Student Achievements
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                  Celebrating our community's excellence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {MOCK_ACHIEVEMENTS.length} Total Achievements
              </span>
            </div>
          </div>
        </div>

        {/* Filter + Cards Section - FIXED */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          {/* Category filter pills - FIXED */}
          <div className="flex flex-wrap gap-2 mb-6">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  activeCategory === cat
                    ? "bg-blue-600 dark:bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Cards grid */}
          {displayed.length === 0 ? (
            <EmptyState category={activeCategory} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayed.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>

              {/* View All / Show Less - FIXED */}
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowAll((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    {showAll ? "Show Less" : `View All (${filtered.length})`}
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${showAll ? "rotate-90" : ""}`}
                    />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}