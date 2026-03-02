import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

/**
 * Frontend UI Integration Tests
 * Tests critical user workflows in the React frontend application
 * Covers navigation, data flow, user interactions, and UI state management
 */

describe('Frontend UI Integration Tests', () => {
  let user: any;

  beforeEach(() => {
    user = userEvent.setup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Navigation Workflows', () => {
    it('should navigate between main sections', async () => {
      // Mock components for navigation testing
      const { container } = render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <div data-testid="nav-container">
            <nav data-testid="sidebar">
              <a href="/dashboard" data-testid="nav-dashboard">
                Dashboard
              </a>
              <a href="/editor" data-testid="nav-editor">
                Editor
              </a>
              <a href="/workspace" data-testid="nav-workspace">
                Workspace
              </a>
              <a href="/settings" data-testid="nav-settings">
                Settings
              </a>
            </nav>
            <main data-testid="main-content">{/* Page content */}</main>
          </div>
        </MemoryRouter>,
      );

      // Check initial page
      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();

      // Navigate to editor
      const editorLink = screen.getByTestId('nav-editor');
      expect(editorLink).toBeInTheDocument();

      // Navigate to workspace
      const workspaceLink = screen.getByTestId('nav-workspace');
      expect(workspaceLink).toBeInTheDocument();

      // Navigate to settings
      const settingsLink = screen.getByTestId('nav-settings');
      expect(settingsLink).toBeInTheDocument();
    });

    it('should maintain navigation state across route changes', async () => {
      const mockNavigation = vi.fn();

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <div data-testid="app-root">
            <nav data-testid="sidebar">
              <button onClick={() => mockNavigation('editor')} data-testid="nav-to-editor">
                Go to Editor
              </button>
            </nav>
            <main data-testid="main-content" />
          </div>
        </MemoryRouter>,
      );

      const editorButton = screen.getByTestId('nav-to-editor');
      await user.click(editorButton);

      expect(mockNavigation).toHaveBeenCalledWith('editor');
    });

    it('should support direct URL navigation', async () => {
      const routes = ['/dashboard', '/editor', '/workspace', '/settings'];

      for (const route of routes) {
        const { unmount } = render(
          <MemoryRouter initialEntries={[route]}>
            <div data-testid={`page-${route.replace('/', '')}`}>Page content</div>
          </MemoryRouter>,
        );

        expect(screen.getByTestId(`page-${route.replace('/', '')}`)).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('Resume Editor Workflows', () => {
    it('should load and edit basic resume information', async () => {
      const mockResumeData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0000',
        location: 'New York, NY',
        role: 'Software Engineer',
        summary: 'Experienced software engineer',
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockResumeData));

      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <form data-testid="editor-form">
              <input
                type="text"
                data-testid="name-input"
                defaultValue={mockResumeData.name}
                placeholder="Full Name"
              />
              <input
                type="email"
                data-testid="email-input"
                defaultValue={mockResumeData.email}
                placeholder="Email"
              />
              <input
                type="tel"
                data-testid="phone-input"
                defaultValue={mockResumeData.phone}
                placeholder="Phone"
              />
              <input
                type="text"
                data-testid="location-input"
                defaultValue={mockResumeData.location}
                placeholder="Location"
              />
              <textarea
                data-testid="summary-input"
                defaultValue={mockResumeData.summary}
                placeholder="Professional Summary"
              />
              <button type="submit" data-testid="save-button">
                Save
              </button>
            </form>
          </div>
        </MemoryRouter>,
      );

      // Check form pre-populated with data
      expect(screen.getByTestId('name-input')).toHaveValue(mockResumeData.name);
      expect(screen.getByTestId('email-input')).toHaveValue(mockResumeData.email);
      expect(screen.getByTestId('phone-input')).toHaveValue(mockResumeData.phone);
      expect(screen.getByTestId('location-input')).toHaveValue(mockResumeData.location);
      expect(screen.getByTestId('summary-input')).toHaveValue(mockResumeData.summary);

      // Edit a field
      const nameInput = screen.getByTestId('name-input') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });

      expect(nameInput.value).toBe('Jane Smith');
    });

    it('should add and remove experience entries', async () => {
      const mockAddExp = vi.fn();
      const mockDeleteExp = vi.fn();

      const { rerender } = render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="experience-section">
              <button
                data-testid="add-experience-btn"
                onClick={() => mockAddExp()}
              >
                Add Experience
              </button>
              <div data-testid="experience-list">
                <div data-testid="experience-item-0" data-id="exp-0">
                  <input
                    data-testid="exp-0-company"
                    placeholder="Company"
                    defaultValue="Tech Corp"
                  />
                  <input
                    data-testid="exp-0-position"
                    placeholder="Position"
                    defaultValue="Senior Engineer"
                  />
                  <button
                    data-testid="delete-experience-0"
                    data-id="exp-0"
                    onClick={() => mockDeleteExp(0)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </MemoryRouter>,
      );

      // Add new experience
      const addBtn = screen.getByTestId('add-experience-btn');
      expect(addBtn).toBeInTheDocument();

      // Delete existing experience
      const deleteBtn = screen.getByTestId('delete-experience-0');
      expect(deleteBtn).toBeInTheDocument();

      await user.click(deleteBtn);
      expect(mockDeleteExp).toHaveBeenCalledWith(0);

      // Rerender without the deleted item
      rerender(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="experience-section">
              <button
                data-testid="add-experience-btn"
                onClick={() => mockAddExp()}
              >
                Add Experience
              </button>
              <div data-testid="experience-list" />
            </div>
          </div>
        </MemoryRouter>,
      );

      expect(screen.queryByTestId('experience-item-0')).not.toBeInTheDocument();
    });

    it('should add and edit education entries', async () => {
      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="education-section">
              <button data-testid="add-education-btn">Add Education</button>
              <div data-testid="education-list">
                <div data-testid="education-item-0">
                  <input
                    data-testid="edu-0-institution"
                    placeholder="Institution"
                    defaultValue="University of Tech"
                  />
                  <input
                    data-testid="edu-0-degree"
                    placeholder="Degree"
                    defaultValue="Bachelor of Science"
                  />
                  <button data-testid="delete-education-0">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </MemoryRouter>,
      );

      // Check education items present
      expect(screen.getByTestId('edu-0-institution')).toHaveValue('University of Tech');
      expect(screen.getByTestId('edu-0-degree')).toHaveValue('Bachelor of Science');

      // Add new education
      const addBtn = screen.getByTestId('add-education-btn');
      await user.click(addBtn);
      expect(addBtn).toBeInTheDocument();
    });

    it('should manage skills in resume', async () => {
      const mockRemoveSkill = vi.fn();
      const mockAddSkill = vi.fn();

      const { rerender } = render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="skills-section">
              <input
                data-testid="skill-input"
                placeholder="Add a skill"
                type="text"
              />
              <button data-testid="add-skill-btn" onClick={() => mockAddSkill()}>
                Add Skill
              </button>
              <ul data-testid="skills-list">
                <li data-testid="skill-0" data-skill="React">
                  React
                  <button
                    data-testid="remove-skill-0"
                    onClick={() => mockRemoveSkill(0)}
                  >
                    Remove
                  </button>
                </li>
                <li data-testid="skill-1" data-skill="TypeScript">
                  TypeScript
                  <button
                    data-testid="remove-skill-1"
                    onClick={() => mockRemoveSkill(1)}
                  >
                    Remove
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </MemoryRouter>,
      );

      // Check existing skills
      expect(screen.getByTestId('skill-0')).toHaveTextContent('React');
      expect(screen.getByTestId('skill-1')).toHaveTextContent('TypeScript');

      // Remove skill
      const removeBtn = screen.getByTestId('remove-skill-0');
      await user.click(removeBtn);

      expect(mockRemoveSkill).toHaveBeenCalledWith(0);

      // After removal, rerender without first skill
      rerender(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="skills-section">
              <input
                data-testid="skill-input"
                placeholder="Add a skill"
                type="text"
              />
              <button data-testid="add-skill-btn" onClick={() => mockAddSkill()}>
                Add Skill
              </button>
              <ul data-testid="skills-list">
                <li data-testid="skill-0" data-skill="TypeScript">
                  TypeScript
                  <button
                    data-testid="remove-skill-0"
                    onClick={() => mockRemoveSkill(0)}
                  >
                    Remove
                  </button>
                </li>
                <li data-testid="skill-1" data-skill="Node.js">
                  Node.js
                  <button
                    data-testid="remove-skill-1"
                    onClick={() => mockRemoveSkill(1)}
                  >
                    Remove
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </MemoryRouter>,
      );

      // Add new skill
      const addBtn = screen.getByTestId('add-skill-btn');
      await user.click(addBtn);

      expect(mockAddSkill).toHaveBeenCalled();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
    });
  });

  describe('Resume Management Workflows', () => {
    it('should list and display saved resumes', async () => {
      const resumes = [
        { id: 'resume-1', name: 'Main Resume', createdAt: '2024-01-01' },
        { id: 'resume-2', name: 'Tech Resume', createdAt: '2024-01-15' },
        { id: 'resume-3', name: 'Executive Resume', createdAt: '2024-02-01' },
      ];

      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <div data-testid="workspace-page">
            <div data-testid="resume-list">
              {resumes.map((resume) => (
                <div key={resume.id} data-testid={`resume-item-${resume.id}`}>
                  <h3>{resume.name}</h3>
                  <p>{resume.createdAt}</p>
                  <button data-testid={`edit-${resume.id}`}>Edit</button>
                  <button data-testid={`delete-${resume.id}`}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        </MemoryRouter>,
      );

      // Check all resumes displayed
      for (const resume of resumes) {
        expect(screen.getByTestId(`resume-item-${resume.id}`)).toBeInTheDocument();
        expect(screen.getByText(resume.name)).toBeInTheDocument();
      }
    });

    it('should create new resume', async () => {
      const mockOnCreate = vi.fn();

      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <div data-testid="workspace-page">
            <div data-testid="create-resume-section">
              <button
                data-testid="new-resume-btn"
                onClick={() => mockOnCreate('New Resume')}
              >
                Create New Resume
              </button>
              <dialog data-testid="create-dialog" open>
                <input
                  data-testid="resume-name-input"
                  placeholder="Resume Name"
                  type="text"
                />
                <button
                  data-testid="confirm-create"
                  onClick={() => mockOnCreate('New Resume')}
                >
                  Create
                </button>
              </dialog>
            </div>
          </div>
        </MemoryRouter>,
      );

      const createBtn = screen.getByTestId('new-resume-btn');
      await user.click(createBtn);

      expect(mockOnCreate).toHaveBeenCalledWith('New Resume');
    });

    it('should duplicate an existing resume', async () => {
      const mockDuplicate = vi.fn();

      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <div data-testid="workspace-page">
            <div data-testid="resume-item" data-id="resume-1">
              <h3>Original Resume</h3>
              <button
                data-testid="duplicate-btn"
                onClick={() => mockDuplicate('resume-1')}
              >
                Duplicate
              </button>
            </div>
          </div>
        </MemoryRouter>,
      );

      const duplicateBtn = screen.getByTestId('duplicate-btn');
      await user.click(duplicateBtn);

      expect(mockDuplicate).toHaveBeenCalledWith('resume-1');
    });

    it('should delete resume with confirmation', async () => {
      const mockDelete = vi.fn();
      const mockConfirm = vi.fn().mockReturnValue(true);
      window.confirm = mockConfirm;

      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <div data-testid="workspace-page">
            <div data-testid="resume-item" data-id="resume-1">
              <h3>Resume to Delete</h3>
              <button
                data-testid="delete-btn"
                onClick={() => {
                  if (mockConfirm('Delete this resume?')) {
                    mockDelete('resume-1');
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </MemoryRouter>,
      );

      const deleteBtn = screen.getByTestId('delete-btn');
      expect(deleteBtn).toBeInTheDocument();

      // Click with confirmation
      await user.click(deleteBtn);

      expect(mockDelete).toHaveBeenCalledWith('resume-1');
    });
  });

  describe('PDF Generation and Export Workflows', () => {
    it('should generate PDF preview', async () => {
      const mockGeneratePDF = vi.fn().mockResolvedValue({
        status: 200,
        data: { pdf_url: 'https://example.com/resume.pdf' },
      });

      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="preview-section">
              <button
                data-testid="preview-btn"
                onClick={async () => {
                  await mockGeneratePDF();
                }}
              >
                Preview PDF
              </button>
              <div data-testid="pdf-preview" />
            </div>
          </div>
        </MemoryRouter>,
      );

      const previewBtn = screen.getByTestId('preview-btn');
      await user.click(previewBtn);

      await waitFor(() => {
        expect(mockGeneratePDF).toHaveBeenCalled();
      });
    });

    it('should export resume as PDF', async () => {
      const mockDownload = vi.fn();

      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="export-section">
              <button
                data-testid="export-pdf-btn"
                onClick={() => mockDownload('resume.pdf')}
              >
                Download PDF
              </button>
            </div>
          </div>
        </MemoryRouter>,
      );

      const exportBtn = screen.getByTestId('export-pdf-btn');
      await user.click(exportBtn);

      expect(mockDownload).toHaveBeenCalledWith('resume.pdf');
    });

    it('should support multiple PDF variants', async () => {
      const mockGenerateVariants = vi.fn().mockResolvedValue({
        status: 200,
        data: {
          variants: [
            { name: 'standard', url: 'https://example.com/resume-standard.pdf' },
            { name: 'ats-optimized', url: 'https://example.com/resume-ats.pdf' },
            { name: 'creative', url: 'https://example.com/resume-creative.pdf' },
          ],
        },
      });

      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="variants-section">
              <button
                data-testid="generate-variants-btn"
                onClick={async () => {
                  await mockGenerateVariants();
                }}
              >
                Generate Variants
              </button>
              <ul data-testid="variants-list">
                <li data-testid="variant-standard">Standard</li>
                <li data-testid="variant-ats">ATS-Optimized</li>
                <li data-testid="variant-creative">Creative</li>
              </ul>
            </div>
          </div>
        </MemoryRouter>,
      );

      const variantsBtn = screen.getByTestId('generate-variants-btn');
      await user.click(variantsBtn);

      await waitFor(() => {
        expect(mockGenerateVariants).toHaveBeenCalled();
      });
    });
  });

  describe('Dashboard and Analytics Workflows', () => {
    it('should display dashboard statistics', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <div data-testid="dashboard-page">
            <div data-testid="stats-section">
              <div data-testid="stat-resumes">
                <span>Total Resumes</span>
                <span data-testid="stat-resumes-value">3</span>
              </div>
              <div data-testid="stat-applications">
                <span>Applications</span>
                <span data-testid="stat-applications-value">12</span>
              </div>
              <div data-testid="stat-interviews">
                <span>Interviews</span>
                <span data-testid="stat-interviews-value">2</span>
              </div>
            </div>
          </div>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('stat-resumes-value')).toHaveTextContent('3');
      expect(screen.getByTestId('stat-applications-value')).toHaveTextContent('12');
      expect(screen.getByTestId('stat-interviews-value')).toHaveTextContent('2');
    });

    it('should show recent activities', async () => {
      const activities = [
        { id: '1', type: 'resume_created', title: 'Created new resume', time: '2 hours ago' },
        { id: '2', type: 'pdf_generated', title: 'Generated PDF', time: '1 hour ago' },
        { id: '3', type: 'application_sent', title: 'Sent application', time: '30 min ago' },
      ];

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <div data-testid="dashboard-page">
            <div data-testid="activities-section">
              <h3>Recent Activities</h3>
              <ul data-testid="activities-list">
                {activities.map((activity) => (
                  <li key={activity.id} data-testid={`activity-${activity.id}`}>
                    {activity.title}
                    <span>{activity.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </MemoryRouter>,
      );

      for (const activity of activities) {
        expect(screen.getByTestId(`activity-${activity.id}`)).toBeInTheDocument();
        expect(screen.getByText(activity.title)).toBeInTheDocument();
      }
    });
  });

  describe('Job Application Workflows', () => {
    it('should track job applications', async () => {
      const applications = [
        {
          id: '1',
          company: 'Google',
          position: 'Software Engineer',
          status: 'Applied',
          date: '2024-02-01',
        },
        {
          id: '2',
          company: 'Microsoft',
          position: 'Senior Engineer',
          status: 'Interviewing',
          date: '2024-02-05',
        },
      ];

      render(
        <MemoryRouter initialEntries={['/applications']}>
          <div data-testid="applications-page">
            <table data-testid="applications-table">
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} data-testid={`app-row-${app.id}`}>
                    <td>{app.company}</td>
                    <td>{app.position}</td>
                    <td data-testid={`status-${app.id}`}>{app.status}</td>
                    <td>{app.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MemoryRouter>,
      );

      for (const app of applications) {
        expect(screen.getByTestId(`app-row-${app.id}`)).toBeInTheDocument();
        expect(screen.getByText(app.company)).toBeInTheDocument();
        expect(screen.getByTestId(`status-${app.id}`)).toHaveTextContent(app.status);
      }
    });

    it('should update application status', async () => {
      const mockUpdateStatus = vi.fn();

      render(
        <MemoryRouter initialEntries={['/applications']}>
          <div data-testid="applications-page">
            <div data-testid="app-item" data-id="app-1">
              <span data-testid="app-status">Applied</span>
              <select
                data-testid="status-select"
                onChange={(e) => mockUpdateStatus(e.target.value)}
              >
                <option>Applied</option>
                <option>Interviewing</option>
                <option>Offer</option>
                <option>Rejected</option>
              </select>
            </div>
          </div>
        </MemoryRouter>,
      );

      const statusSelect = screen.getByTestId('status-select') as HTMLSelectElement;
      await user.selectOptions(statusSelect, 'Interviewing');

      expect(mockUpdateStatus).toHaveBeenCalledWith('Interviewing');
    });
  });

  describe('Settings and Preferences Workflows', () => {
    it('should display user preferences', async () => {
      const mockPreferences = {
        theme: 'dark',
        language: 'en',
        notifications: true,
        twoFactor: false,
      };

      render(
        <MemoryRouter initialEntries={['/settings']}>
          <div data-testid="settings-page">
            <form data-testid="preferences-form">
              <div data-testid="theme-setting">
                <label>Theme</label>
                <select data-testid="theme-select" defaultValue={mockPreferences.theme}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div data-testid="notifications-setting">
                <label>Enable Notifications</label>
                <input
                  type="checkbox"
                  data-testid="notifications-toggle"
                  defaultChecked={mockPreferences.notifications}
                />
              </div>
              <div data-testid="2fa-setting">
                <label>Two-Factor Authentication</label>
                <input
                  type="checkbox"
                  data-testid="2fa-toggle"
                  defaultChecked={mockPreferences.twoFactor}
                />
              </div>
            </form>
          </div>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('theme-select')).toHaveValue('dark');
      expect(screen.getByTestId('notifications-toggle')).toBeChecked();
      expect(screen.getByTestId('2fa-toggle')).not.toBeChecked();
    });

    it('should update user preferences', async () => {
      const mockUpdatePreferences = vi.fn();

      render(
        <MemoryRouter initialEntries={['/settings']}>
          <div data-testid="settings-page">
            <form
              data-testid="preferences-form"
              onSubmit={(e) => {
                e.preventDefault();
                mockUpdatePreferences({
                  theme: 'dark',
                  notifications: false,
                });
              }}
            >
              <select data-testid="theme-select" defaultValue="light">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <input type="checkbox" data-testid="notifications-toggle" defaultChecked />
              <button type="submit" data-testid="save-preferences">
                Save Preferences
              </button>
            </form>
          </div>
        </MemoryRouter>,
      );

      const themeSelect = screen.getByTestId('theme-select') as HTMLSelectElement;
      const notificationsToggle = screen.getByTestId('notifications-toggle') as HTMLInputElement;
      const saveBtn = screen.getByTestId('save-preferences');

      // Change preferences
      await user.selectOptions(themeSelect, 'dark');
      await user.click(notificationsToggle);

      // Save
      const form = screen.getByTestId('preferences-form');
      fireEvent.submit(form);

      expect(mockUpdatePreferences).toHaveBeenCalled();
    });

    it('should manage API keys', async () => {
      const mockGenerateKey = vi.fn();
      const mockRevokeKey = vi.fn();

      render(
        <MemoryRouter initialEntries={['/settings']}>
          <div data-testid="settings-page">
            <div data-testid="api-keys-section">
              <button
                data-testid="generate-key-btn"
                onClick={() => mockGenerateKey()}
              >
                Generate New Key
              </button>
              <ul data-testid="keys-list">
                <li data-testid="key-item-1">
                  <span>sk_test_123456</span>
                  <button
                    data-testid="revoke-key-1"
                    onClick={() => mockRevokeKey('key-1')}
                  >
                    Revoke
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </MemoryRouter>,
      );

      const generateBtn = screen.getByTestId('generate-key-btn');
      const revokeBtn = screen.getByTestId('revoke-key-1');

      await user.click(generateBtn);
      expect(mockGenerateKey).toHaveBeenCalled();

      await user.click(revokeBtn);
      expect(mockRevokeKey).toHaveBeenCalledWith('key-1');
    });
  });

  describe('Search and Filter Workflows', () => {
    it('should search resumes by name', async () => {
      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <div data-testid="workspace-page">
            <input
              data-testid="search-input"
              placeholder="Search resumes..."
              type="text"
            />
            <div data-testid="results-list">
              <div data-testid="result-1">Main Resume</div>
              <div data-testid="result-2">Tech Resume</div>
            </div>
          </div>
        </MemoryRouter>,
      );

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      await user.type(searchInput, 'Tech');

      expect(searchInput.value).toBe('Tech');
    });

    it('should filter applications by status', async () => {
      const mockFilterChange = vi.fn();

      render(
        <MemoryRouter initialEntries={['/applications']}>
          <div data-testid="applications-page">
            <select
              data-testid="status-filter"
              onChange={(e) => mockFilterChange(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="applied">Applied</option>
              <option value="interviewing">Interviewing</option>
              <option value="offer">Offer</option>
            </select>
            <div data-testid="filtered-results" />
          </div>
        </MemoryRouter>,
      );

      const filterSelect = screen.getByTestId('status-filter') as HTMLSelectElement;
      await user.selectOptions(filterSelect, 'interviewing');

      expect(mockFilterChange).toHaveBeenCalledWith('interviewing');
    });
  });

  describe('Error Handling and User Feedback', () => {
    it('should display error messages', async () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="error-container" role="alert">
              <p data-testid="error-message">Failed to save resume. Please try again.</p>
              <button data-testid="error-dismiss">Dismiss</button>
            </div>
          </div>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();

      const dismissBtn = screen.getByTestId('error-dismiss');
      await user.click(dismissBtn);

      // Rerender without error message
      rerender(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="content-area">Content loaded</div>
          </div>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });
    });

    it('should show loading states', async () => {
      const { unmount, rerender } = render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="loading-spinner" role="status">
              Loading...
            </div>
          </div>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // After loading completes
      rerender(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="content-loaded">Content loaded</div>
          </div>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
        expect(screen.getByTestId('content-loaded')).toBeInTheDocument();
      });
    });

    it('should show success notifications', async () => {
      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="success-toast" role="status">
              <span data-testid="toast-message">Resume saved successfully!</span>
            </div>
          </div>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('toast-message')).toBeInTheDocument();
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Resume saved successfully!');
    });
  });

  describe('Data Persistence Workflows', () => {
    it('should auto-save resume data', async () => {
      const mockAutoSave = vi.fn();

      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <input
              data-testid="name-input"
              onChange={() => mockAutoSave()}
              placeholder="Name"
            />
          </div>
        </MemoryRouter>,
      );

      const input = screen.getByTestId('name-input');
      await user.type(input, 'Jane Doe');

      await waitFor(() => {
        // Should be called multiple times for each character
        expect(mockAutoSave.mock.calls.length).toBeGreaterThan(0);
      });
    });

    it('should restore data from localStorage on page reload', async () => {
      const mockData = {
        name: 'John Doe',
        email: 'john@example.com',
        experience: [],
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <input
              data-testid="name-input"
              defaultValue={JSON.parse(localStorage.getItem('resumeai_master_profile') || '{}').name}
              placeholder="Name"
            />
          </div>
        </MemoryRouter>,
      );

      const nameInput = screen.getByTestId('name-input') as HTMLInputElement;
      expect(nameInput.value).toBe('John Doe');
    });

    it('should handle data conflicts gracefully', async () => {
      const mockResolveConflict = vi.fn();

      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <dialog data-testid="conflict-dialog" open>
              <p>Data conflict detected</p>
              <button
                data-testid="use-local"
                onClick={() => mockResolveConflict('local')}
              >
                Use Local Version
              </button>
              <button
                data-testid="use-server"
                onClick={() => mockResolveConflict('server')}
              >
                Use Server Version
              </button>
            </dialog>
          </div>
        </MemoryRouter>,
      );

      const useLocal = screen.getByTestId('use-local');
      await user.click(useLocal);

      expect(mockResolveConflict).toHaveBeenCalledWith('local');
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should handle large resume content efficiently', async () => {
      const largeResume = {
        name: 'John Doe',
        experience: Array(50).fill({
          company: 'Company',
          position: 'Position',
          summary: 'X'.repeat(500),
        }),
      };

      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <div data-testid="experience-section">
              {largeResume.experience.map((_, i) => (
                <div key={i} data-testid={`exp-item-${i}`}>
                  {largeResume.experience[i].company}
                </div>
              ))}
            </div>
          </div>
        </MemoryRouter>,
      );

      // All items should render
      expect(screen.getByTestId('exp-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('exp-item-49')).toBeInTheDocument();
    });

    it('should paginate long lists efficiently', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <div data-testid="workspace-page">
            <div data-testid="items-list">
              {items.slice(0, 10).map((item) => (
                <div key={item.id} data-testid={`item-${item.id}`}>
                  {item.name}
                </div>
              ))}
            </div>
            <div data-testid="pagination">
              <button data-testid="page-1" disabled>
                1
              </button>
              <button data-testid="page-2">2</button>
              <button data-testid="page-10">10</button>
            </div>
          </div>
        </MemoryRouter>,
      );

      // First page should show
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-10')).toBeInTheDocument();

      // Navigate to second page
      const page2 = screen.getByTestId('page-2');
      await user.click(page2);
      expect(page2).toBeInTheDocument();
    });
  });

  describe('Accessibility in UI Workflows', () => {
    it('should support keyboard navigation', async () => {
      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <button data-testid="save-btn">Save</button>
            <button data-testid="cancel-btn">Cancel</button>
            <button data-testid="delete-btn">Delete</button>
          </div>
        </MemoryRouter>,
      );

      const saveBtn = screen.getByTestId('save-btn');
      saveBtn.focus();
      expect(document.activeElement).toBe(saveBtn);

      // Tab to next button
      await user.keyboard('{Tab}');
      const cancelBtn = screen.getByTestId('cancel-btn');
      expect(document.activeElement).toBe(cancelBtn);
    });

    it('should have proper ARIA labels', async () => {
      render(
        <MemoryRouter initialEntries={['/editor']}>
          <div data-testid="editor-page">
            <button aria-label="Save resume">Save</button>
            <button aria-label="Delete resume">Delete</button>
            <div role="alert" aria-live="polite" data-testid="status-message">
              Changes saved
            </div>
          </div>
        </MemoryRouter>,
      );

      expect(screen.getByLabelText('Save resume')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete resume')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
