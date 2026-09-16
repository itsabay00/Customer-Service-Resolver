export const colors = {
  bg: "#F5F5F5",
  black: "#000000",
  ink: "#171717",
  gray: "#818181",
  border: "#EDEDED",
  redTint: "#FEECEB",
  red: "#FF4745",
  yellowTint: "#FFF9E7",
  yellow: "#FEC008",
  greenTint: "#E4F9EE",
  green: "#00BE52",
  blueTint: "#E8F6FF",
  blue: "#1897FF",
};

export const SHADOW = "0 4px 20px rgba(0, 0, 0, 0.06)";

export const URGENCY_STYLES = {
  Low: { tint: colors.greenTint, dot: colors.green },
  Medium: { tint: colors.yellowTint, dot: colors.yellow },
  High: { tint: colors.redTint, dot: colors.red },
};

export const SENTIMENT_STYLES = {
  Positive: { tint: colors.greenTint, dot: colors.green },
  Neutral: { tint: "#EDEDED", dot: colors.gray },
  Frustrated: { tint: colors.yellowTint, dot: colors.yellow },
  Angry: { tint: colors.redTint, dot: colors.red },
};

export const STATUS_STYLES = {
  Open: { tint: colors.blueTint, dot: colors.blue },
  Resolved: { tint: colors.greenTint, dot: colors.green },
};
