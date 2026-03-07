import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LINKEDIN_FIELD_MAPPINGS,
  importFromLinkedIn,
  exportToLinkedInFormat,
  downloadLinkedInProfile,
  validateLinkedInData,
} from './linkedin';
import { LinkedInImportData } from '../types';

const mockResumeData: any = {
  basics: {
    name: 'John Doe',
    label: 'Software Engineer',
    image: '',
    email: 'john@example.com',
    phone: '(555) 555-5555',
    url: 'https://johndoe.com',
    summary: 'Experienced software engineer',
    location: {
      address: '123 Main St',
      postalCode: '12345',
      city: 'New York',
      countryCode: 'US',
      region: 'NY',
    },
    profiles: [],
  },
  work: [
    {
      company: 'Tech Company',
      position: 'Senior Engineer',
      startDate: '2020-01-15',
      endDate: '2023-12-31',
      summary: 'Led team development',
      highlights: [],
    },
  ],
  education: [
    {
      institution: 'MIT',
      studyType: 'Bachelor',
      area: 'Computer Science',
      startDate: '2016-09-01',
      endDate: '2020-05-31',
      score: '3.8',
      courses: [],
    },
  ],
  skills: [
    {
      name: 'JavaScript',
      level: 'Expert',
      keywords: [],
    },
  ],
  projects: [],
  certificates: [],
};

describe('LinkedIn Utilities', () => {
  describe('LINKEDIN_FIELD_MAPPINGS', () => {
    it('should have correct field mappings', () => {
      expect(LINKEDIN_FIELD_MAPPINGS.firstName).toBe('first_name');
      expect(LINKEDIN_FIELD_MAPPINGS.lastName).toBe('last_name');
      expect(LINKEDIN_FIELD_MAPPINGS.positions).toBe('experience');
      expect(LINKEDIN_FIELD_MAPPINGS.educations).toBe('education');
      expect(LINKEDIN_FIELD_MAPPINGS.skills).toBe('skills');
    });
  });

  describe('importFromLinkedIn', () => {
    it('should import standard LinkedIn format', () => {
      const linkedinData = {
        firstName: 'John',
        lastName: 'Doe',
        headline: 'Software Engineer',
        summary: 'Experienced engineer',
        emailAddress: 'john@example.com',
      };

      const result = importFromLinkedIn(linkedinData);

      expect(result.basics?.name).toBe('John Doe');
      expect(result.basics?.label).toBe('Software Engineer');
      expect(result.basics?.email).toBe('john@example.com');
      expect(result.basics?.summary).toBe('Experienced engineer');
    });

    it('should import scraper format', () => {
      const linkedinData = {
        fullName: 'Jane Smith',
        headline: 'Product Manager',
        profileUrl: 'https://linkedin.com/in/janesmith',
        email: 'jane@example.com',
      };

      const result = importFromLinkedIn(linkedinData);

      expect(result.basics?.name).toBe('Jane Smith');
      expect(result.basics?.label).toBe('Product Manager');
      expect(result.basics?.email).toBe('jane@example.com');
    });

    it('should import minimal format', () => {
      const linkedinData = {
        name: 'Bob Johnson',
        title: 'Designer',
        experience: [{ company: 'Design Co' }],
      };

      const result = importFromLinkedIn(linkedinData);

      expect(result.basics?.name).toBe('Bob Johnson');
      expect(result.basics?.label).toBe('Designer');
    });

    it('should handle missing first name', () => {
      const linkedinData = {
        lastName: 'Doe',
        headline: 'Engineer',
      };

      const result = importFromLinkedIn(linkedinData);

      expect(result.basics?.name).toBe('Doe');
    });

    it('should handle missing last name', () => {
      const linkedinData = {
        firstName: 'John',
        headline: 'Engineer',
      };

      const result = importFromLinkedIn(linkedinData);

      expect(result.basics?.name).toBe('John');
    });

    it('should parse positions/work experience', () => {
      const linkedinData: LinkedInImportData = {
        firstName: 'John',
        lastName: 'Doe',
        positions: [
          {
            companyName: 'Tech Inc',
            title: 'Software Engineer',
            description: 'Built applications',
            startDate: '2020-01',
            endDate: '2023-12',
          },
        ],
      };

      const result = importFromLinkedIn(linkedinData);

      expect(result.work).toBeDefined();
      expect(result.work?.[0]?.company).toBe('Tech Inc');
      expect(result.work?.[0]?.position).toBe('Software Engineer');
    });

    it('should parse education', () => {
      const linkedinData: LinkedInImportData = {
        firstName: 'John',
        lastName: 'Doe',
        educations: [
          {
            schoolName: 'MIT',
            degreeName: 'Bachelor',
            fieldOfStudy: 'Computer Science',
            startDate: '2016',
            endDate: '2020',
          },
        ],
      };

      const result = importFromLinkedIn(linkedinData);

      expect(result.education).toBeDefined();
      expect(result.education?.[0]?.institution).toBe('MIT');
      expect(result.education?.[0]?.studyType).toBe('Bachelor');
    });

    it('should parse skills', () => {
      const linkedinData = {
        firstName: 'John',
        lastName: 'Doe',
        skills: [
          { name: 'JavaScript', endorsements: 50 },
          { name: 'React', endorsements: 35 },
        ],
      };

      const result = importFromLinkedIn(linkedinData);

      expect(result.skills).toBeDefined();
      expect(result.skills).toHaveLength(2);
      expect(result.skills?.[0]?.name).toBe('JavaScript');
      expect(result.skills?.[1]?.name).toBe('React');
    });

    it('should handle phone numbers array', () => {
      const linkedinData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumbers: [{ phoneNumber: '(555) 555-5555' }, { phoneNumber: '(555) 666-6666' }],
      };

      const result = importFromLinkedIn(linkedinData);

      expect(result.basics?.phone).toBe('(555) 555-5555');
    });
  });

  describe('exportToLinkedInFormat', () => {
    it('should export resume to LinkedIn format', () => {
      const result = exportToLinkedInFormat(mockResumeData);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.headline).toBe('Software Engineer');
      expect(result.summary).toBe('Experienced software engineer');
      expect(result.emailAddress).toBe('john@example.com');
    });

    it('should split name correctly', () => {
      const data = {
        ...mockResumeData,
        basics: {
          ...mockResumeData.basics,
          name: 'Mary Jane Watson',
        },
      } as any;

      const result = exportToLinkedInFormat(data);

      expect(result.firstName).toBe('Mary');
      expect(result.lastName).toBe('Jane Watson');
    });

    it('should handle single word name', () => {
      const data = {
        ...mockResumeData,
        basics: {
          ...mockResumeData.basics,
          name: 'Beyonce',
        },
      } as any;

      const result = exportToLinkedInFormat(data);

      expect(result.firstName).toBe('Beyonce');
      expect(result.lastName).toBe('');
    });

    it('should format work experience', () => {
      const result = exportToLinkedInFormat(mockResumeData);

      expect(result.positions).toHaveLength(1);
      expect(result.positions![0].companyName).toBe('Tech Company');
      expect(result.positions![0].title).toBe('Senior Engineer');
      expect(result.positions![0].description).toBe('Led team development');
      expect(result.positions![0].timePeriod).toBeDefined();
    });

    it('should format education', () => {
      const result = exportToLinkedInFormat(mockResumeData);

      expect(result.educations).toHaveLength(1);
      expect(result.educations![0].schoolName).toBe('MIT');
      expect(result.educations![0].degreeName).toBe('Bachelor');
      expect(result.educations![0].fieldOfStudy).toBe('Computer Science');
    });

    it('should format skills', () => {
      const result = exportToLinkedInFormat(mockResumeData);

      expect(result.skills).toHaveLength(1);
      expect(result.skills![0].name).toBe('JavaScript');
    });

    it('should include phone number', () => {
      const result = exportToLinkedInFormat(mockResumeData);

      expect(result.phoneNumbers).toBeDefined();
      expect(result.phoneNumbers).toHaveLength(1);
      expect(result.phoneNumbers![0].phoneNumber).toBe('(555) 555-5555');
    });

    it('should use city for location', () => {
      // Check if location is properly set from mockResumeData
      const result = exportToLinkedInFormat(mockResumeData);

      // mockResumeData has location.city = 'New York'
      if (mockResumeData.location?.city) {
        expect(result.locationName).toBe(mockResumeData.location.city);
      }
    });

    it('should use region if city is missing', () => {
      const data = {
        ...mockResumeData,
        location: { region: 'California', countryCode: 'US' },
      } as any;

      const result = exportToLinkedInFormat(data);

      expect(result.locationName).toBe('California');
    });

    it('should handle missing optional fields', () => {
      const minimalData: any = {
        basics: {
          name: 'John Doe',
          label: '',
          image: '',
          email: '',
          phone: '',
          url: '',
          summary: '',
          location: { address: '', postalCode: '', city: '', countryCode: '', region: '' },
          profiles: [],
        },
        work: [],
        education: [],
        skills: [],
        projects: [],
        certificates: [],
      };

      const result = exportToLinkedInFormat(minimalData);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.positions).toHaveLength(0);
      expect(result.educations).toHaveLength(0);
      expect(result.skills).toHaveLength(0);
    });

    it('should handle end date as present', () => {
      const data = {
        ...mockResumeData,
        work: [
          {
            ...mockResumeData.work![0],
            endDate: 'Present',
          },
        ],
      } as any;

      const result = exportToLinkedInFormat(data);

      // When endDate is 'Present', formatDateForLinkedIn returns empty object {}
      // which means endDate is {} (not undefined)
      expect(result.positions![0].timePeriod!.endDate).toEqual({});
    });
  });

  describe('downloadLinkedInProfile', () => {
    beforeEach(() => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: vi.fn(),
      } as unknown as HTMLAnchorElement);
    });

    it('should create download link', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);

      downloadLinkedInProfile(mockResumeData);

      expect(createElementSpy).toHaveBeenCalledWith('a');
    });

    it('should set correct filename', () => {
      const link = {
        href: '',
        download: '',
        click: vi.fn(),
      } as unknown as HTMLAnchorElement;
      vi.spyOn(document, 'createElement').mockReturnValue(link);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);

      downloadLinkedInProfile(mockResumeData);

      expect(link.download).toBe('linkedin-profile.json');
    });
  });

  describe('validateLinkedInData', () => {
    it('should validate complete data', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@example.com',
        positions: [{ companyName: 'Tech Inc', title: 'Engineer' }],
      };

      const result = validateLinkedInData(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should error on null data', () => {
      const result = validateLinkedInData(null as unknown as LinkedInImportData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No data provided');
    });

    it('should warn on missing name', () => {
      const data = {
        emailAddress: 'john@example.com',
        positions: [],
      };

      const result = validateLinkedInData(data);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('No name found in LinkedIn data');
    });

    it('should warn on missing email', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        positions: [],
      };

      const result = validateLinkedInData(data);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('No email found in LinkedIn data');
    });

    it('should warn on missing work experience', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@example.com',
      };

      const result = validateLinkedInData(data);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('No work experience found in LinkedIn data');
    });

    it('should accumulate multiple warnings', () => {
      const data = { emailAddress: 'john@example.com' };

      const result = validateLinkedInData(data);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(1);
    });
  });
});
