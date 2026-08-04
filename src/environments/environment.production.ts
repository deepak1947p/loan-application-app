export const environment = {
  production: true,
  apiBaseUrl: 'https://dmi-loan-mock-api.onrender.com',
  mockLatency: {
    loginMs: 1000,
    initialSkeletonMs: 600,
  },
} as const;
