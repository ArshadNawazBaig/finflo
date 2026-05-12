const calculatePercentageChange = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const change = ((current - previous) / previous) * 100;
  return Number(change.toFixed(1));
};

// Adds `months` to `date` without the setMonth() roll-forward bug
// (e.g. Jan 31 + 1 month should land on Feb 28/29, not Mar 2/3).
const addMonthsSafe = (date, months) => {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  const targetYear = d.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  // Last day of the target month
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const day = Math.min(d.getDate(), lastDay);
  return new Date(
    targetYear,
    normalizedMonth,
    day,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  );
};

const getMonthDates = (monthsAgo = 0) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() - monthsAgo + 1,
    0,
    23,
    59,
    59,
  );
  return { start, end };
};

module.exports = {
  calculatePercentageChange,
  getMonthDates,
  addMonthsSafe,
};
