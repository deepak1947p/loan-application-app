export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:3000',
  mockLatency: {
    loginMs: 800,
    initialSkeletonMs: 600,
  },
} as const;
