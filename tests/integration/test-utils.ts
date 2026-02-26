// Integration test utilities
export const mockPdfResponse = {
  pdf_url: "https://storage.example.com/resume.pdf",
  generated_at: new Date().toISOString()
};

export const mockOAuthResponse = {
  access_token: "test_token_123",
  user: { id: "gh_123", name: "Test User" }
};

export const mockResumeData = {
  id: "resume_123",
  title: "Test Resume",
  content: { personalInfo: { name: "John Doe" } }
};

export function setupApiMocks() {
  global.fetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockPdfResponse)
  });
}
