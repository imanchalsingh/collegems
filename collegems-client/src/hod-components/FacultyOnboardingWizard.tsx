import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  User, Mail, Lock, Phone, MapPin, Briefcase, Building2,
  GraduationCap, UploadCloud, CheckCircle2, ChevronRight,
  ChevronLeft, X, FileText, Loader2, Info
} from "lucide-react";
import api from "../api/axios";
import { getAcademicLabel } from "../utils/academicLabels";
import { useAcademicLabels } from "../hooks/useAcademicLabels";

interface WizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

const getSteps = (academicLabels: any) => [
  { id: "personal", title: "Personal Info", icon: User },
  { id: "contact", title: "Contact Details", icon: Phone },
  { id: "academic", title: "Qualifications", icon: GraduationCap },
  { id: "employment", title: "Employment", icon: Briefcase },
  {
    id: "department",
    title: getAcademicLabel("department", academicLabels),
    icon: Building2,
  },
  { id: "documents", title: "Documents", icon: UploadCloud },
  { id: "review", title: "Review", icon: CheckCircle2 },
];

const DRAFT_KEY = "faculty_onboarding_draft";

export const FacultyOnboardingWizard: React.FC<WizardProps> = ({ onClose, onSuccess }) => {
  const { data: academicLabels } = useAcademicLabels();
  const STEPS = getSteps(academicLabels);
  const { darkMode } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Simulated upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    emergencyContact: "",
    highestDegree: "",
    university: "",
    teacherId: "",
    department: "",
    joinDate: "",
    bio: "",
    documentName: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currentStep !== undefined) {
          setCurrentStep(parsed.currentStep);
          setForm(parsed.form || form);
        }
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, currentStep }));
  }, [form, currentStep]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear specific error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 0) {
      if (!form.name.trim()) newErrors.name = "Full name is required";
      if (!form.email.trim()) newErrors.email = "Email is required";
      else if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = "Invalid email format";
      if (!form.password) newErrors.password = "Temporary password is required";
    } else if (currentStep === 1) {
      if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    } else if (currentStep === 3) {
      if (!form.teacherId.trim()) newErrors.teacherId = "Teacher ID is required";
    } else if (currentStep === 4) {
      if (!form.department.trim()) newErrors.department = `${getAcademicLabel("department", academicLabels)} is required`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep() && currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});
    try {
      const bioText = `Degree: ${form.highestDegree}, University: ${form.university}. ${form.bio}`;
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        teacherId: form.teacherId,
        department: form.department,
        bio: bioText,
      };

      await api.post("/users/teachers", payload);
      clearDraft();
      onSuccess();
    } catch (err: any) {
      setErrors({ submit: err.response?.data?.message || "Failed to create teacher account." });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setForm(prev => ({ ...prev, documentName: file.name }));
      simulateUpload();
    }
  };

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const inputCls = (name: string) => `w-full px-4 py-2.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border ${errors[name] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500'} rounded-xl focus:ring-2 text-gray-900 dark:text-white transition-all`;
  const labelCls = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";
  const errorMsg = (name: string) => errors[name] && <p className="text-red-500 text-xs mt-1 animate-in slide-in-from-top-1">{errors[name]}</p>;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1">Personal Information</h3>
              <p className="text-gray-500 text-sm">Let's start with the basic details of the faculty member.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input name="name" value={form.name} onChange={handleChange} className={`${inputCls('name')} pl-10`} placeholder="Dr. Jane Doe" />
                </div>
                {errorMsg('name')}
              </div>
              
              <div>
                <label className={labelCls}>Email Address *</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input name="email" type="email" value={form.email} onChange={handleChange} className={`${inputCls('email')} pl-10`} placeholder="jane.doe@college.edu" />
                </div>
                {errorMsg('email')}
              </div>
              
              <div>
                <label className={labelCls}>Temporary Password *</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input name="password" type="password" value={form.password} onChange={handleChange} className={`${inputCls('password')} pl-10`} placeholder="••••••••" />
                </div>
                {errorMsg('password')}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1">Contact Details</h3>
              <p className="text-gray-500 text-sm">How can we reach the faculty member?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Phone Number *</label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                  <input name="phone" value={form.phone} onChange={handleChange} className={`${inputCls('phone')} pl-10`} placeholder="+1 (555) 000-0000" />
                </div>
                {errorMsg('phone')}
              </div>
              
              <div>
                <label className={labelCls}>Emergency Contact</label>
                <div className="relative group">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                  <input name="emergencyContact" value={form.emergencyContact} onChange={handleChange} className={`${inputCls('emergencyContact')} pl-10`} placeholder="John Doe - +1 (555) 111-1111" />
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">Academic Qualifications</h3>
              <p className="text-gray-500 text-sm">Record their highest degree and institution.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Highest Degree</label>
                <input name="highestDegree" value={form.highestDegree} onChange={handleChange} className={inputCls('highestDegree')} placeholder="e.g., Ph.D. in Computer Science" />
              </div>
              <div>
                <label className={labelCls}>University / Institution</label>
                <input name="university" value={form.university} onChange={handleChange} className={inputCls('university')} placeholder="e.g., MIT" />
              </div>
              <div>
                <label className={labelCls}>Additional Notes / Bio</label>
                <textarea name="bio" value={form.bio} onChange={handleChange} className={inputCls('bio')} rows={3} placeholder="Brief background or achievements..." />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent mb-1">Employment Information</h3>
              <p className="text-gray-500 text-sm">Assign an internal tracking ID.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Teacher ID *</label>
                <input name="teacherId" value={form.teacherId} onChange={handleChange} className={inputCls('teacherId')} placeholder="e.g., FAC2024001" />
                {errorMsg('teacherId')}
              </div>
              <div>
                <label className={labelCls}>Join Date</label>
                <input name="joinDate" type="date" value={form.joinDate} onChange={handleChange} className={inputCls('joinDate')} />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-1">{getAcademicLabel("department", academicLabels)} Assignment</h3>
              <p className="text-gray-500 text-sm">Select the primary department for this faculty member.</p>
            </div>
            
            <div>
              <label className={labelCls}>{getAcademicLabel("department", academicLabels)} *</label>
              <select name="department" value={form.department} onChange={handleChange} className={inputCls('department')}>
                <option value="">Select a department</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="English">English</option>
              </select>
              {errorMsg('department')}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent mb-1">Document Uploads</h3>
              <p className="text-gray-500 text-sm">Securely stage identification and resume documents.</p>
            </div>
            
            <div className="relative border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl p-10 text-center bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all cursor-pointer group overflow-hidden">
              <UploadCloud className="w-12 h-12 text-indigo-400 group-hover:text-indigo-600 group-hover:scale-110 transition-transform duration-300 mx-auto mb-4" />
              <p className="text-gray-900 dark:text-white font-semibold text-lg">Click to upload or drag and drop</p>
              <p className="text-sm text-gray-500 mt-1">SVG, PNG, JPG or PDF (max. 10MB)</p>
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                onChange={handleFileUpload} 
              />
            </div>

            {isUploading && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 font-medium">
                  <span>Uploading {form.documentName}...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300 ease-out rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {!isUploading && form.documentName && (
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900/50 shadow-sm rounded-xl animate-in slide-in-from-bottom-2 duration-300">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{form.documentName}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Ready for submission
                  </p>
                </div>
                <button onClick={() => setForm(p => ({...p, documentName: ""}))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-xs font-medium">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Documents are securely staged locally and will be processed upon final registration confirmation.</p>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Review & Confirm</h3>
              <p className="text-gray-500 mt-1">Verify all details before finalizing registration.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Personal Card */}
              <div className="bg-white dark:bg-gray-800/80 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400 font-semibold border-b border-gray-100 dark:border-gray-700 pb-2">
                  <User className="w-4 h-4" /> Personal
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex flex-col"><span className="text-gray-500 text-xs">Name</span><span className="font-medium dark:text-gray-200">{form.name}</span></div>
                  <div className="flex flex-col"><span className="text-gray-500 text-xs">Email</span><span className="font-medium dark:text-gray-200 truncate">{form.email}</span></div>
                </div>
              </div>

              {/* Employment Card */}
              <div className="bg-white dark:bg-gray-800/80 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400 font-semibold border-b border-gray-100 dark:border-gray-700 pb-2">
                  <Briefcase className="w-4 h-4" /> Employment
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex flex-col"><span className="text-gray-500 text-xs">Teacher ID</span><span className="font-medium dark:text-gray-200">{form.teacherId}</span></div>
                  <div className="flex flex-col"><span className="text-gray-500 text-xs">{getAcademicLabel("department", academicLabels)}</span><span className="font-medium dark:text-gray-200">{form.department}</span></div>
                </div>
              </div>
              
              {/* Contact Card */}
              <div className="bg-white dark:bg-gray-800/80 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow sm:col-span-2">
                <div className="flex items-center gap-2 mb-3 text-green-600 dark:text-green-400 font-semibold border-b border-gray-100 dark:border-gray-700 pb-2">
                  <Phone className="w-4 h-4" /> Contact
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex flex-col"><span className="text-gray-500 text-xs">Phone</span><span className="font-medium dark:text-gray-200">{form.phone}</span></div>
                </div>
              </div>
            </div>
            
            {errors.submit && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm font-medium text-center animate-in zoom-in-95">
                {errors.submit}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl w-full max-w-4xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{getAcademicLabel("faculty", academicLabels)} Onboarding</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="font-medium text-blue-600 dark:text-blue-400">Step {currentStep + 1} of {STEPS.length}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
              <span>{STEPS[currentStep].title}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={clearDraft} className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              Reset Draft
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Progress Stepper Line */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1 relative overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-in-out" 
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="hidden sm:block w-72 bg-gray-50/50 dark:bg-gray-900/50 border-r border-gray-200/50 dark:border-gray-800/50 p-8 overflow-y-auto">
            <div className="space-y-8 relative">
              {/* Connecting vertical line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-gray-200 dark:bg-gray-800 -z-10" />
              
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = idx < currentStep;
                const isCurrent = idx === currentStep;
                
                return (
                  <div key={step.id} className="relative flex items-center gap-4 group cursor-default">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 z-10
                      ${isCompleted ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20' : 
                        isCurrent ? 'bg-white dark:bg-gray-800 ring-2 ring-blue-500 text-blue-600 dark:text-blue-400 shadow-sm' : 
                        'bg-gray-100 dark:bg-gray-800 text-gray-400'}
                    `}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} />}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold transition-colors ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                        {step.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col p-6 sm:p-10 overflow-y-auto relative">
            <div className="flex-1 max-w-xl mx-auto w-full">
              {renderStepContent()}
            </div>

            {/* Footer Actions */}
            <div className="max-w-xl mx-auto w-full mt-10 pt-6 border-t border-gray-100 dark:border-gray-800/50 flex items-center justify-between">
              <button 
                onClick={handlePrev}
                disabled={currentStep === 0 || loading}
                className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-0 transition-all flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {currentStep === STEPS.length - 1 ? (
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Complete Registration</>
                  )}
                </button>
              ) : (
                <button 
                  onClick={handleNext}
                  className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 hover:translate-x-1"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyOnboardingWizard;
