export const omitTimestamp = {
  createdAt: true,
  updatedAt: true,
} as const

export const omitTimestampWithDeletedAt = {
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const
