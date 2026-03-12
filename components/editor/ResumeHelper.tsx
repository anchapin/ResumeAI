import React, { useState } from 'react';

interface RolePhrases {
  role: string;
  phrases: string[];
}

const ROLE_PHRASES: RolePhrases[] = [
  {
    role: 'Software Engineer',
    phrases: [
      'Developed and maintained scalable web applications using React and Node.js.',
      'Optimized database queries, reducing latency by 40%.',
      'Collaborated with cross-functional teams to define and implement new features.',
      'Implemented automated testing, increasing code coverage to 85%.',
      'Mentored junior developers and conducted thorough code reviews.',
    ],
  },
  {
    role: 'Product Manager',
    phrases: [
      'Defined product roadmap and prioritized features based on market research.',
      'Led agile development teams to deliver high-quality products on schedule.',
      'Analyzed user feedback and data to drive product improvements.',
      'Communicated product vision and strategy to stakeholders.',
      'Managed end-to-end product lifecycle from conception to launch.',
    ],
  },
  {
    role: 'Data Scientist',
    phrases: [
      'Built predictive models using machine learning algorithms to solve business problems.',
      'Cleaned and analyzed large datasets to extract actionable insights.',
      'Visualized data findings using tools like Tableau or Matplotlib.',
      'Developed and deployed data pipelines for real-time analysis.',
      'Collaborated with engineering teams to integrate models into production.',
    ],
  },
  {
    role: 'UX Designer',
    phrases: [
      'Created wireframes and prototypes to communicate design ideas.',
      'Conducted user research and usability testing to inform design decisions.',
      'Designed intuitive user interfaces that enhanced user experience.',
      'Collaborated with developers to ensure design feasibility and consistency.',
      'Developed design systems to maintain brand integrity across platforms.',
    ],
  },
];

interface ResumeHelperProps {
  onSelectPhrase: (phrase: string) => void;
  onClose: () => void;
}

export const ResumeHelper: React.FC<ResumeHelperProps> = ({ onSelectPhrase, onClose }) => {
  const [selectedRole, setSelectedRole] = useState(ROLE_PHRASES[0].role);

  const activeRolePhrases = ROLE_PHRASES.find((rp) => rp.role === selectedRole);

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl w-80 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 text-primary-600 font-bold">
          <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          <span>Resume Helper</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-md transition-colors"
          aria-label="Close helper"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Select Role
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
          >
            {ROLE_PHRASES.map((rp) => (
              <option key={rp.role} value={rp.role}>
                {rp.role}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Suggested Phrases
          </label>
          <p className="text-xs text-slate-500 italic">
            Click a phrase to add it to your clipboard or editor.
          </p>
          <div className="space-y-2">
            {activeRolePhrases?.phrases.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPhrase(phrase)}
                className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50/50 text-xs text-slate-700 leading-relaxed transition-all group relative"
              >
                {phrase}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-primary-500 text-[16px]">add_circle</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex gap-2 text-amber-800">
            <span className="material-symbols-outlined text-[18px]">lightbulb</span>
            <span className="text-xs font-bold uppercase tracking-wide">Quick Tip</span>
          </div>
          <p className="text-xs text-amber-700 mt-2 leading-relaxed">
            Quantify your achievements! Instead of saying "Optimized queries," say "Optimized queries, reducing latency by 40%."
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <button 
          className="w-full py-2 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
          onClick={() => alert("AI generation coming soon!")}
        >
          <span className="material-symbols-outlined text-[18px]">psychology</span>
          Generate with AI
        </button>
      </div>
    </div>
  );
};
