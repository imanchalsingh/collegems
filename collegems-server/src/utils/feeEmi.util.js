/**
 * Build an EMI installment schedule for a remaining fee balance.
 * planType: "2_stage" | "4_stage" | "monthly"
 */
export const PLAN_TYPES = ["2_stage", "4_stage", "monthly"];

export const planLabel = (planType) => {
  switch (planType) {
    case "2_stage":
      return "2-stage (semester)";
    case "4_stage":
      return "4-stage (quarterly)";
    case "monthly":
      return "Monthly (12 EMIs)";
    default:
      return planType;
  }
};

const installmentCount = (planType) => {
  if (planType === "2_stage") return 2;
  if (planType === "4_stage") return 4;
  if (planType === "monthly") return 12;
  throw new Error(`Unsupported planType: ${planType}`);
};

const monthsBetweenInstallments = (planType) => {
  if (planType === "2_stage") return 6;
  if (planType === "4_stage") return 3;
  return 1;
};

/** Split amount into N parts; last installment absorbs rounding remainder (paise → whole rupees). */
export const splitAmount = (totalAmount, parts) => {
  const total = Math.round(Number(totalAmount));
  if (!Number.isFinite(total) || total < 0) {
    throw new Error("totalAmount must be a non-negative number");
  }
  if (!Number.isInteger(parts) || parts < 1) {
    throw new Error("parts must be a positive integer");
  }
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) =>
    i === parts - 1 ? base + remainder : base
  );
};

export const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Clamp overflow (e.g. Jan 31 + 1 month)
  if (d.getDate() < day) d.setDate(0);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * @returns {{ planType, count, installments: { sequence, amount, dueDate }[] }}
 */
export const calculateEmiSchedule = ({
  remainingAmount,
  planType,
  startDate = new Date(),
}) => {
  if (!PLAN_TYPES.includes(planType)) {
    throw new Error(`planType must be one of: ${PLAN_TYPES.join(", ")}`);
  }
  const remaining = Math.max(0, Math.round(Number(remainingAmount)));
  if (remaining <= 0) {
    throw new Error("No remaining balance to schedule");
  }

  const count = installmentCount(planType);
  const amounts = splitAmount(remaining, count);
  const gap = monthsBetweenInstallments(planType);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const installments = amounts.map((amount, index) => ({
    sequence: index + 1,
    amount,
    dueDate: addMonths(start, index * gap),
  }));

  return { planType, count, installments };
};

/**
 * Late fee after grace period: percent of installment amount (default 2%/day capped at 20%).
 */
export const calculateOverduePenalty = ({
  installmentAmount,
  dueDate,
  gracePeriodDays = 7,
  dailyPercent = 2,
  maxPercent = 20,
  asOf = new Date(),
}) => {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date(asOf);
  today.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysPastDue = Math.floor((today - due) / msPerDay);
  const daysPastGrace = daysPastDue - Number(gracePeriodDays);

  if (daysPastGrace <= 0) {
    return { penalty: 0, daysPastDue, daysPastGrace: Math.max(0, daysPastGrace) };
  }

  const percent = Math.min(maxPercent, daysPastGrace * dailyPercent);
  const penalty = Math.round((Number(installmentAmount) * percent) / 100);
  return { penalty, daysPastDue, daysPastGrace, percent };
};
