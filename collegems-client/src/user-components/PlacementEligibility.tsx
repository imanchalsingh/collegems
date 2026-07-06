import { useEffect, useState } from "react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { Briefcase, CheckCircle, XCircle } from "lucide-react";

interface Drive {
  _id: string;
  companyName: string;
  role: string;
  description: string;
  driveDate: string;
  lastDateToApply: string;
  status: string;
  eligibility: {
    minCGPA: number;
    maxBacklogs: number;
    allowedBranches: string[];
  };
}

interface EligibilityResult {
  drive: Drive;
  eligible: boolean;
  reasons: string[];
}

const PlacementEligibility = () => {
  const [results, setResults] = useState<EligibilityResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/placement/my-eligibility");
        setResults(extractArray(res.data));
      } catch (err) {
        console.error("Error fetching eligibility:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;

  if (results.length === 0)
    return (
      <div className="text-center py-12">
        <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No placement drives available</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">
        Placement Drives
      </h2>
      {results.map(({ drive, eligible, reasons }) => (
        <div
          key={drive._id}
          className={`bg-white rounded-xl border-2 p-5 ${
            eligible ? "border-green-200" : "border-red-200"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg text-gray-900">
                {drive.companyName}
              </h3>
              <p className="text-gray-600">{drive.role}</p>
              {drive.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {drive.description}
                </p>
              )}
            </div>
            {eligible ? (
              <div className="flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle className="w-5 h-5" />
                Eligible
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500 font-medium">
                <XCircle className="w-5 h-5" />
                Not Eligible
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-4 text-sm text-gray-500">
            {drive.driveDate && (
              <span>📅 Drive: {new Date(drive.driveDate)
                .toLocaleDateString()}</span>
            )}
            {drive.lastDateToApply && (
              <span>⏰ Apply by: {new Date(drive.lastDateToApply)
                .toLocaleDateString()}</span>
            )}
          </div>

          {!eligible && reasons.length > 0 && (
            <div className="mt-3 bg-red-50 rounded-lg p-3">
              <p className="text-sm font-medium text-red-700 mb-1">
                Reasons:
              </p>
              {reasons.map((r, i) => (
                <p key={i} className="text-sm text-red-600">
                  • {r}
                </p>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-3 text-xs text-gray-400">
            {drive.eligibility.minCGPA > 0 && (
              <span>Min CGPA: {drive.eligibility.minCGPA}</span>
            )}
            {drive.eligibility.maxBacklogs >= 0 && (
              <span>Max Backlogs: {drive.eligibility.maxBacklogs}</span>
            )}
            {drive.eligibility.allowedBranches?.length > 0 && (
              <span>
                Branches: {drive.eligibility.allowedBranches.join(", ")}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlacementEligibility;
