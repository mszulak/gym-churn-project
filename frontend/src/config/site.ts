export const siteConfig = {
  name: "Gym Churn Analysis",
  shortName: "GCA",
  version: "0.1",
  description:
    "Detect gym members at high risk of membership cancellation and act before they leave.",
} as const;

export const uploadConfig = {
  maxFileSizeBytes: 50 * 1024 * 1024,
  previewRows: 10,
  acceptedExtensions: [".csv"],
  acceptedMimeTypes: ["text/csv", "application/vnd.ms-excel", "text/plain", ""],
} as const;
