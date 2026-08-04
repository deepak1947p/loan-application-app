export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  mockLatency: {
    loginMs: 800,
    initialSkeletonMs: 600,
  },
} as const;
