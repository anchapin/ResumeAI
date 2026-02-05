import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Workspace from './pages/Workspace';
import JobApplications from './pages/JobApplications';
import { Route, ResumeData } from './types';

const initialResumeData: ResumeData = {
  name: "Alex Rivera",
  email: "alex.rivera@example.com",
  phone: "+1 (555) 012-3456",
  location: "San Francisco, CA",
  role: "Senior Product Designer",
  experience: [
    {
      id: '1',
      company: 'TechCorp Solutions',
      role: 'Senior Software Engineer',
      startDate: 'Jan 2020',
      endDate: 'Present',
      current: true,
      description: 'Led the migration of legacy monolithic architecture to microservices using AWS and Node.js, improving system scalability by 40%.',
      tags: ['AWS', 'Microservices']
    },
    {
      id: '2',
      company: 'StartupHub Inc',
      role: 'Software Developer',
      startDate: 'Jun 2017',
      endDate: 'Dec 2019',
      current: false,
      description: 'Mentored a team of 5 junior developers and implemented CI/CD pipelines reducing deployment time by 50%.',
      tags: ['Mentorship', 'CI/CD']
    }
  ]
};

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>(Route.DASHBOARD);
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeData);

  const renderContent = () => {
    switch (currentRoute) {
      case Route.DASHBOARD:
        return (
            <div className="flex min-h-screen bg-[#f6f6f8]">
                <Sidebar currentRoute={currentRoute} onNavigate={setCurrentRoute} />
                <Dashboard />
            </div>
        );
      case Route.APPLICATIONS:
        return (
            <div className="flex min-h-screen bg-[#f6f6f8]">
                <Sidebar currentRoute={currentRoute} onNavigate={setCurrentRoute} />
                <JobApplications />
            </div>
        );
      case Route.EDITOR:
        return (
          <Editor 
            resumeData={resumeData} 
            onUpdate={setResumeData} 
            onBack={() => setCurrentRoute(Route.DASHBOARD)} 
          />
        );
      case Route.WORKSPACE:
        return (
          <Workspace 
            resumeData={resumeData}
            onNavigate={setCurrentRoute} 
          />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="font-sans text-slate-900">
      {renderContent()}
    </div>
  );
}

export default App;