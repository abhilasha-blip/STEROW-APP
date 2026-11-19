// Test configuration. Hosts are reserved .test domains; msw intercepts every request.
module.exports = {
  __esModule: true,
  default: {
    APP_API_BASE_URL: 'https://app.sterow.test/api/public/v1',
    SUPABASE_URL: 'https://project.supabase.test',
    SUPABASE_ANON_KEY: 'test-anon-key',
    TEST_PHONE: '9999999999',
  },
};
