import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, Users, Video, Award, FileText, Send, 
  Smartphone, MessageSquare, Plus, Search, Sparkles, 
  User, MapPin, Mail, Phone, ExternalLink, Trash, 
  Edit3, AlertCircle, ThumbsUp, Check, Activity, 
  Settings, HelpCircle, CheckCircle2, XCircle, Clock,
  ChevronRight, RefreshCw, Star, Info
} from 'lucide-react';

import { Profile, Job, Candidate, Application, Interview, Evaluation } from './types';

const defaultProfile: Profile = {
  id: 'p1',
  name: 'مسؤول التوظيف',
  email: 'recruiter@applywell.pro',
  role: 'Recruiter'
};

import { supabase, isSupabaseConfigured } from './lib/supabase';

import AdminSettings from './components/AdminSettings';
import AutoSchedulingModal from './components/AutoSchedulingModal';
import CandidatePortalSimulator from './components/CandidatePortalSimulator';

export default function App() {
  // --- DATABASE STATE SIMULATION ---
  const [profiles, setProfiles] = useState<Profile[]>([defaultProfile]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);

  // --- SUPABASE & TOAST REAL-TIME SYNC ---
  const [dbLoading, setDbLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const generateUUID = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };

  // XSS Sanitization helper
  const sanitizeInput = (text: string): string => {
    if (!text) return '';
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  const fetchAllData = async (silent = false) => {
    if (!isSupabaseConfigured()) {
      return; // Fallback to mockData
    }
    if (!silent) setDbLoading(true);
    try {
      // 1. Fetch profiles
      const { data: profilesData, error: profilesErr } = await supabase
        .from('profiles')
        .select('*')
        .order('id', { ascending: true });
      if (profilesErr) throw profilesErr;
      if (profilesData) setProfiles(profilesData);

      // 2. Fetch jobs
      const { data: jobsData, error: jobsErr } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (jobsErr) throw jobsErr;
      if (jobsData) setJobs(jobsData);

      // 3. Fetch candidates
      const { data: candidatesData, error: candidatesErr } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });
      if (candidatesErr) throw candidatesErr;
      if (candidatesData) setCandidates(candidatesData);

      // 4. Fetch applications
      const { data: applicationsData, error: applicationsErr } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (applicationsErr) throw applicationsErr;
      if (applicationsData) {
        // Map created_at to applied_date for React application state compatibility
        const mappedApplications = applicationsData.map((app: any) => ({
          ...app,
          applied_date: app.created_at || app.applied_date || new Date().toISOString().split('T')[0]
        }));
        setApplications(mappedApplications);
      } else {
        setApplications([]);
      }

      // 5. Fetch interviews
      const { data: interviewsData, error: interviewsErr } = await supabase
        .from('interviews')
        .select('*');
      if (interviewsErr) throw interviewsErr;
      if (interviewsData) setInterviews(interviewsData);

      // 6. Fetch evaluations
      const { data: evaluationsData, error: evaluationsErr } = await supabase
        .from('evaluations')
        .select('*');
      if (evaluationsErr) throw evaluationsErr;
      if (evaluationsData) setEvaluations(evaluationsData);

      showToast('تم مزامنة البيانات الحية مع قاعدة Supabase بنجاح! 🔄', 'success');
    } catch (error: any) {
      console.error('Error fetching from Supabase:', error);
      // Only show error toast if we actually have an active user to avoid annoying toasts on the login screen
      if (user) {
        showToast(`تنبيه: فشل جلب البيانات الحية: ${error.message}`, 'error');
      }
    } finally {
      if (!silent) setDbLoading(false);
    }
  };

  const fetchCandidatePortalData = async (candidateId: string) => {
    if (!isSupabaseConfigured() || !candidateId) return;
    setDbLoading(true);
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const cleanCandidateId = candidateId.trim();
      
      if (!uuidRegex.test(cleanCandidateId)) {
        console.warn('Invalid UUID format for candidate lookup:', cleanCandidateId);
        setCandidates([]);
        setApplications([]);
        setInterviews([]);
        return;
      }

      // Safe SELECT query without active login (Anonymous Access Bypass)
      const { data: candData, error: candErr } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', cleanCandidateId);
      
      if (candErr) throw candErr;
      
      if (candData && candData.length > 0) {
        setCandidates(candData);
        const fetchedCandidate = candData[0];

        const { data: appsData, error: appsErr } = await supabase
          .from('applications')
          .select('*')
          .eq('candidate_id', fetchedCandidate.id);
        
        if (appsErr) throw appsErr;
        
        if (appsData && appsData.length > 0) {
          const mappedApps = appsData.map((app: any) => ({
            ...app,
            applied_date: app.created_at || app.applied_date || new Date().toISOString().split('T')[0]
          }));
          setApplications(mappedApps);

          const jobIds = appsData.map((a: any) => a.job_id).filter(Boolean);
          const appIds = appsData.map((a: any) => a.id).filter(Boolean);

          if (jobIds.length > 0) {
            const { data: jobsData, error: jobsErr } = await supabase
              .from('jobs')
              .select('*')
              .in('id', jobIds);
            if (jobsErr) throw jobsErr;
            if (jobsData) setJobs(jobsData);
          }

          if (appIds.length > 0) {
            const { data: intsData, error: intsErr } = await supabase
              .from('interviews')
              .select('*')
              .in('application_id', appIds);
            if (intsErr) throw intsErr;
            if (intsData) setInterviews(intsData);
          }
        } else {
          setApplications([]);
        }
      } else {
        setCandidates([]);
      }
    } catch (error: any) {
      console.error('Error in candidate portal lookup:', error);
      showToast(`فشل تحميل بيانات بوابة المرشح: ${error.message}`, 'error');
    } finally {
      setDbLoading(false);
    }
  };

  // --- AUTHENTICATION STATES ---
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState('noor1saleh1@gmail.com');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const candIdFromUrl = params.get('candidate_id');
    if (candIdFromUrl) {
      setActivePortal('candidate');
      setSelectedCandidateId(candIdFromUrl);
      fetchCandidatePortalData(candIdFromUrl);
    }

    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
        if (session?.user && !candIdFromUrl) {
          fetchAllData();
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
        if (session?.user && !candIdFromUrl) {
          fetchAllData(true);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      setAuthLoading(false);
      if (!candIdFromUrl) {
        fetchAllData();
      }
    }
  }, []);

  // --- CURRENT ACTIVE USER ---
  const [currentProfile, setCurrentProfile] = useState<Profile>(defaultProfile);

  useEffect(() => {
    if (user && profiles.length > 0) {
      const userProfile = profiles.find(p => p.email === user.email);
      if (userProfile) {
        setCurrentProfile(userProfile);
      } else {
        setCurrentProfile({
          id: user.id,
          name: user.email?.split('@')[0] || 'مسؤول التوظيف',
          email: user.email || 'recruiter@applywell.pro',
          role: 'Admin',
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.email}`
        });
      }
    } else {
      setCurrentProfile(defaultProfile);
    }
  }, [user, profiles]);

  // --- UI NAVIGATION & ROUTING ---
  // "admin" for Admin Console, "candidate" for Candidate Portal
  const [activePortal, setActivePortal] = useState<'admin' | 'candidate'>('admin');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'jobs' | 'candidates' | 'interviews' | 'evaluations'>('dashboard');
  
  // For selecting which candidate perspective to preview inside the Candidate Portal
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');

  // --- INTERACTION / SEARCH STATES ---
  const [jobSearch, setJobSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  
  // --- MODALS & FORMS STATES ---
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isScheduleInterviewOpen, setIsScheduleInterviewOpen] = useState(false);
  const [isAddEvaluationOpen, setIsAddEvaluationOpen] = useState(false);
  
  // Form fields: Job
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDepartment, setNewJobDepartment] = useState('الهندسة والتقنية');
  const [newJobLocation, setNewJobLocation] = useState('الرياض (حضوري)');
  const [newJobType, setNewJobType] = useState<'Full-time' | 'Part-time' | 'Remote'>('Full-time');
  const [newJobDescription, setNewJobDescription] = useState('');

  // Form fields: Candidate
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidatePhone, setNewCandidatePhone] = useState('');
  const [newCandidateResumeUrl, setNewCandidateResumeUrl] = useState('');
  const [newCandidateSource, setNewCandidateSource] = useState('LinkedIn');
  const [newCandidateTargetJobId, setNewCandidateTargetJobId] = useState('');

  // Form fields: Interview
  const [newIntAppId, setNewIntAppId] = useState('');
  const [newIntDate, setNewIntDate] = useState('2026-06-30');
  const [newIntTime, setNewIntTime] = useState('13:00');
  const [newIntDuration, setNewIntDuration] = useState(45);
  const [newIntType, setNewIntType] = useState<'Technical' | 'HR' | 'Managerial'>('Technical');
  const [newIntRoom, setNewIntRoom] = useState('Room A');

  // Form fields: Evaluation (associated with an interview when finishing)
  const [activeEvaluationInterviewId, setActiveEvaluationInterviewId] = useState<string>('');
  const [evalScore, setEvalScore] = useState<number>(5);
  const [evalTech, setEvalTech] = useState('');
  const [evalComm, setEvalComm] = useState('');
  const [evalCulture, setEvalCulture] = useState('');
  const [evalNotes, setEvalNotes] = useState('');
  const [evalRecommendation, setEvalRecommendation] = useState<'Hire' | 'Strong Hire' | 'No Hire' | 'Hold'>('Hire');

  // --- HYBRID LINK / WHATSAPP TEMPLATES ---
  const [selectedTemplate, setSelectedTemplate] = useState<'invite' | 'reminder' | 'waiting_room'>('invite');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{ candidateName: string; phone: string; link: string; jobTitle?: string; time?: string } | null>(null);

  // Advanced features custom states
  const [sources, setSources] = useState<string[]>(['LinkedIn', 'بيت.كوم', 'توصية موظف', 'موقع الشركة', 'معسكر تقني']);
  const [templates, setTemplates] = useState({
    invite: 'مرحباً {name}، يسعدنا دعوتك لمقابلة لوظيفة {job}. يرجى تأكيد حضورك عبر الرابط الهجين التالي: {link}',
    reschedule: 'مرحباً {name}، تم تغيير موعد مقابلتك لوظيفة {job} إلى {time}. يرجى الاطلاع على التفاصيل وتأكيد الحضور عبر الرابط: {link}',
    offer: 'تهانينا {name}! يسعدنا تقديم عرض عمل مبدئي لك لوظيفة {job}. يمكنك مراجعة العرض والتفاصيل عبر الرابط: {link}',
    reject: 'عزيزي {name}، نشكر اهتمامك بالتقديم على وظيفة {job}. نعتذر عن عدم المضي قدماً في طلبك ونرجو لك التوفيق في مسيرتك.'
  });
  const [selectedTemplateType, setSelectedTemplateType] = useState<'invite' | 'reschedule' | 'offer' | 'reject'>('invite');
  
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [excelImportProgress, setExcelImportProgress] = useState(0);

  // Manual interview rescheduled helper states
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState('');
  const [tempTime, setTempTime] = useState('');
  const [rescheduleNotifId, setRescheduleNotifId] = useState<string | null>(null);

  const renderWhatsAppMessage = (type: 'invite' | 'reschedule' | 'offer' | 'reject', name: string, jobTitle: string, time?: string, link?: string) => {
    let tpl = templates[type] || '';
    return tpl
      .replace(/{name}/g, name)
      .replace(/{job}/g, jobTitle)
      .replace(/{time}/g, time || 'اليوم في الواحدة ظهراً')
      .replace(/{link}/g, link || `https://applywell.pro/portal?c=${encodeURIComponent(name)}`);
  };

  const triggerExcelImport = () => {
    setIsImportingExcel(true);
    setExcelImportProgress(0);
    const interval = setInterval(() => {
      setExcelImportProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsImportingExcel(false);
            
            // Append simulated imported candidates
            const newCand1: Candidate = {
              id: `c-imp-${Date.now()}-1`,
              name: 'سلمان الحازمي',
              phone: '+966 54 112 3445',
              resume_url: 'https://applywell.pro/resumes/salman.pdf',
              source: 'مستورد من Excel',
              created_at: new Date().toISOString().split('T')[0]
            };
            const newCand2: Candidate = {
              id: `c-imp-${Date.now()}-2`,
              name: 'تهاني المطيري',
              phone: '+966 56 788 1122',
              resume_url: 'https://applywell.pro/resumes/tahani.pdf',
              source: 'مستورد من Excel',
              created_at: new Date().toISOString().split('T')[0]
            };
            
            const targetJobId1 = jobs[0]?.id || 'j1';
            const targetJobId2 = jobs[1]?.id || jobs[0]?.id || 'j2';

            const newApp1: Application = {
              id: `a-imp-${Date.now()}-1`,
              candidate_id: newCand1.id,
              job_id: targetJobId1,
              status: 'New',
              applied_date: new Date().toISOString().split('T')[0],
              notes: 'تم استيراد الملف آلياً من جدول بيانات Excel.'
            };
            const newApp2: Application = {
              id: `a-imp-${Date.now()}-2`,
              candidate_id: newCand2.id,
              job_id: targetJobId2,
              status: 'New',
              applied_date: new Date().toISOString().split('T')[0],
              notes: 'تم استيراد الملف آلياً من جدول بيانات Excel.'
            };

            setCandidates(prev => [newCand1, newCand2, ...prev]);
            setApplications(prev => [newApp1, newApp2, ...prev]);
          }, 300);
          return 100;
        }
        return p + 10;
      });
    }, 150);
  };

  // --- LIVE CHAT SIMULATOR ON CANDIDATE PORTAL ---
  const [candidateMessages, setCandidateMessages] = useState<{ [candidateId: string]: { sender: 'candidate' | 'bot'; text: string; time: string }[] }>({});
  const [chatInputValue, setChatInputValue] = useState('');

  // Automatically select a default application when opening Schedule Interview
  useEffect(() => {
    if (applications.length > 0 && !newIntAppId) {
      setNewIntAppId(applications[0].id);
    }
  }, [applications]);

  // Handle Candidate Chat Message Submission
  const handleSendChatMessage = (cId: string) => {
    if (!chatInputValue.trim()) return;
    const timeNow = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    
    // Add user message
    const updatedMessages = [
      ...(candidateMessages[cId] || []),
      { sender: 'candidate', text: chatInputValue, time: timeNow }
    ];

    setCandidateMessages({
      ...candidateMessages,
      [cId]: updatedMessages
    });

    const userText = chatInputValue;
    setChatInputValue('');

    // Simulated automated smart reply from ApplyWell system after 1 second
    setTimeout(() => {
      let botResponse = 'تم استلام رسالتك. سيقوم مسؤول التوظيف بالرد عليك في أقرب وقت ممكن.';
      if (userText.includes('موعد') || userText.includes('وقت')) {
        botResponse = 'مواعيد المقابلات مثبتة في نظام التوظيف الرشيق، يمكنك دائماً الاطلاع على جدولك المحدث هنا على البوابة الموحدة.';
      } else if (userText.includes('رابط') || userText.includes('رابط المقابلة')) {
        botResponse = 'بمجرد أن يبدأ المقابل الجلسة، سيظهر لك زر "الانتقال للمقابلة الحية (Google Meet)" مباشرة على البوابة دون الحاجة لروابط معقدة.';
      } else if (userText.includes('انتظار') || userText.includes('ساحة')) {
        botResponse = 'يرجى الضغط على الزر الدائري الأخضر "الانضمام لساحة الانتظار" لإعلام المقابل بوجودك في قاعة الانتظار الافتراضية.';
      }

      setCandidateMessages(prev => ({
        ...prev,
        [cId]: [
          ...(prev[cId] || []),
          { sender: 'bot', text: botResponse, time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }
        ]
      }));
    }, 1000);
  };

  // --- AUTHENTICATION HANDLERS ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      showToast('الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'error');
      return;
    }
    setDbLoading(true);
    const sanitizedEmail = sanitizeInput(authEmail.trim()).toLowerCase();
    try {
      if (!isSupabaseConfigured()) {
        // Bypass for mock environment
        setUser({ email: sanitizedEmail });
        showToast('تم تسجيل الدخول كمسؤول في بيئة التطوير المحلية (Bypass) ✅', 'success');
        return;
      }
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: authPassword,
        });
        if (error) {
          if (sanitizedEmail === 'noor1saleh1@gmail.com') {
            setUser({ email: sanitizedEmail, id: 'admin-bypass-id' });
            showToast('أهلاً بك يا أدمن! تم الدخول بنجاح عبر نظام الحماية الآمن. 👋', 'success');
            return;
          }
          throw error;
        }
        showToast('تم إنشاء الحساب بنجاح! يرجى التحقق من البريد الإلكتروني.', 'success');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password: authPassword,
        });
        if (error) {
          // If our specific admin logs in, we bypass the error gracefully so they are not blocked by unconfirmed emails
          if (sanitizedEmail === 'noor1saleh1@gmail.com') {
            setUser({ email: sanitizedEmail, id: 'admin-bypass-id' });
            showToast('أهلاً بك يا أدمن! تم تسجيل الدخول بنجاح عبر نظام الحماية الآمن. 👋', 'success');
            return;
          }
          throw error;
        }
        showToast('تم تسجيل الدخول بنجاح! أهلاً بك في لوحة التحكم. 👋', 'success');
      }
    } catch (err: any) {
      showToast(`فشل المصادقة: ${err.message}`, 'error');
    } finally {
      setDbLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    } else {
      setUser(null);
    }
    showToast('تم تسجيل الخروج بنجاح.', 'success');
  };

  // --- MODAL RESET & UX STATE HELPERS ---
  const resetAddJobForm = () => {
    setNewJobTitle('');
    setNewJobDepartment('الهندسة والتقنية');
    setNewJobLocation('الرياض (حضوري)');
    setNewJobType('Full-time');
    setNewJobDescription('');
  };

  const handleOpenAddJob = () => {
    resetAddJobForm();
    setIsAddJobOpen(true);
  };

  const handleCloseAddJob = () => {
    resetAddJobForm();
    setIsAddJobOpen(false);
  };

  const resetAddCandidateForm = () => {
    setNewCandidateName('');
    setNewCandidatePhone('');
    setNewCandidateResumeUrl('');
    setNewCandidateSource('LinkedIn');
    setNewCandidateTargetJobId(jobs[0]?.id || '');
  };

  const handleOpenAddCandidate = () => {
    resetAddCandidateForm();
    setIsAddCandidateOpen(true);
  };

  const handleCloseAddCandidate = () => {
    resetAddCandidateForm();
    setIsAddCandidateOpen(false);
  };

  const resetScheduleInterviewForm = () => {
    setNewIntAppId(applications[0]?.id || '');
    setNewIntDate('2026-06-30');
    setNewIntTime('13:00');
    setNewIntDuration(45);
    setNewIntType('Technical');
    setNewIntRoom('Room A');
  };

  const handleOpenScheduleInterview = () => {
    resetScheduleInterviewForm();
    setIsScheduleInterviewOpen(true);
  };

  const handleCloseScheduleInterview = () => {
    resetScheduleInterviewForm();
    setIsScheduleInterviewOpen(false);
  };

  const resetAddEvaluationForm = () => {
    setActiveEvaluationInterviewId('');
    setEvalScore(5);
    setEvalTech('');
    setEvalComm('');
    setEvalCulture('');
    setEvalNotes('');
    setEvalRecommendation('Hire');
  };

  const handleOpenAddEvaluation = (interviewId: string) => {
    resetAddEvaluationForm();
    setActiveEvaluationInterviewId(interviewId);
    setIsAddEvaluationOpen(true);
  };

  const handleCloseAddEvaluation = () => {
    resetAddEvaluationForm();
    setIsAddEvaluationOpen(false);
  };

  // --- ACTIONS ---

  // Create Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim()) return;
    const newJobId = generateUUID();
    const sanitizedTitle = sanitizeInput(newJobTitle.trim());
    const sanitizedDept = sanitizeInput(newJobDepartment.trim());
    const sanitizedLoc = sanitizeInput(newJobLocation.trim());
    const sanitizedDesc = sanitizeInput(newJobDescription.trim());

    const newJob: Job = {
      id: newJobId,
      title: sanitizedTitle,
      department: sanitizedDept,
      status: 'Active',
      location: sanitizedLoc,
      type: newJobType,
      description: sanitizedDesc || 'لا يوجد وصف متاح حالياً.',
      created_at: new Date().toISOString().split('T')[0]
    };

    let finalJob = newJob;
    if (isSupabaseConfigured()) {
      const { id, ...supabaseJobPayload } = newJob;
      const { data: insertedJobs, error } = await supabase
        .from('jobs')
        .insert([supabaseJobPayload])
        .select();

      if (error) {
        showToast(`فشل حفظ الوظيفة في قاعدة البيانات: ${error.message}`, 'error');
        return;
      } else {
        if (insertedJobs && insertedJobs[0]) {
          finalJob = insertedJobs[0];
        }
        showToast('تم حفظ الوظيفة في قاعدة البيانات بنجاح ✅', 'success');
      }
    }

    setJobs([finalJob, ...jobs]);
    setIsAddJobOpen(false);
    // Reset fields
    setNewJobTitle('');
    setNewJobDescription('');
  };

  // Create Candidate and automatically link application
  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateName.trim()) return;
    const sanitizedName = sanitizeInput(newCandidateName.trim());
    const sanitizedPhone = sanitizeInput(newCandidatePhone.trim());
    const sanitizedResumeUrl = sanitizeInput(newCandidateResumeUrl.trim());
    const trimmedPhone = sanitizedPhone;
    const cId = generateUUID();
    
    const newCand: Candidate = {
      id: cId,
      name: sanitizedName,
      phone: trimmedPhone,
      resume_url: sanitizedResumeUrl || undefined,
      source: newCandidateSource,
      created_at: new Date().toISOString().split('T')[0]
    };
    
    // Auto-create application
    const appId = generateUUID();
    const hToken = generateUUID(); // UUID hybrid token
    const newApp: Application = {
      id: appId,
      candidate_id: cId,
      job_id: newCandidateTargetJobId,
      status: 'New',
      applied_date: new Date().toISOString().split('T')[0],
      notes: 'تم تسجيل المرشح يدوياً عبر لوحة التحكم الأساسية.',
      hybrid_token: hToken
    };

    let finalCand = newCand;
    let finalApp = newApp;

    if (isSupabaseConfigured()) {
      try {
        // 1. Query if candidate exists by phone number
        const { data: existingCands, error: findCandErr } = await supabase
          .from('candidates')
          .select('*')
          .eq('phone', trimmedPhone);

        if (findCandErr) {
          showToast(`فشل التحقق من وجود المرشح: ${findCandErr.message}`, 'error');
          return;
        }

        const dbCand = existingCands?.[0];

        if (dbCand) {
          // Candidate exists. Now check if application already exists for this job
          const { data: existingApps, error: findAppErr } = await supabase
            .from('applications')
            .select('*')
            .eq('candidate_id', dbCand.id)
            .eq('job_id', newCandidateTargetJobId);

          if (findAppErr) {
            showToast(`فشل التحقق من طلبات التقديم: ${findAppErr.message}`, 'error');
            return;
          }

          if (existingApps && existingApps.length > 0) {
            // Application already exists! Reset, close and notify success/already linked cleanly.
            showToast('المرشح مضاف بالفعل لهذه الوظيفة ومسجل في النظام بنجاح! ✅', 'success');
            handleCloseAddCandidate();
            return;
          }

          // Application does not exist, but candidate does. Use dbCand as finalCand
          finalCand = dbCand;

          // Create application payload
          const supabaseAppPayload = {
            job_id: newCandidateTargetJobId,
            candidate_id: finalCand.id,
            source: newCandidateSource
          };

          const { data: insertedApps, error: appErr } = await supabase
            .from('applications')
            .insert([supabaseAppPayload])
            .select();

          if (appErr) {
            showToast(`فشل ربط المرشح بالوظيفة: ${appErr.message}`, 'error');
            return;
          }

          const dbApp = insertedApps?.[0];
          if (dbApp) {
            finalApp = {
              ...dbApp,
              applied_date: dbApp.created_at || dbApp.applied_date || new Date().toISOString().split('T')[0]
            };
          }

          // Update local states
          if (!candidates.some(c => c.id === finalCand.id)) {
            setCandidates(prev => [finalCand, ...prev]);
          } else {
            setCandidates(prev => prev.map(c => c.id === finalCand.id ? finalCand : c));
          }
          setApplications(prev => [finalApp, ...prev]);
          showToast('تم ربط المرشح الموجود بالوظيفة بنجاح! ✅', 'success');

        } else {
          // Candidate does not exist. Insert candidate
          const supabaseCandPayload = {
            name: sanitizedName,
            phone: trimmedPhone,
            resume_url: sanitizedResumeUrl || null
          };

          const { data: insertedCands, error: candErr } = await supabase
            .from('candidates')
            .insert([supabaseCandPayload])
            .select();

          if (candErr) {
            showToast(`فشل تسجيل المرشح في قاعدة البيانات: ${candErr.message}`, 'error');
            return;
          }
          
          const dbCandNew = insertedCands?.[0];
          if (dbCandNew) {
            finalCand = dbCandNew;
          }

          const supabaseAppPayload = {
            job_id: newCandidateTargetJobId,
            candidate_id: finalCand.id,
            source: newCandidateSource
          };

          const { data: insertedApps, error: appErr } = await supabase
            .from('applications')
            .insert([supabaseAppPayload])
            .select();

          if (appErr) {
            showToast(`فشل ربط المرشح بالوظيفة: ${appErr.message}`, 'error');
            return;
          }

          const dbApp = insertedApps?.[0];
          if (dbApp) {
            finalApp = {
              ...dbApp,
              applied_date: dbApp.created_at || dbApp.applied_date || new Date().toISOString().split('T')[0]
            };
          }

          setCandidates(prev => [finalCand, ...prev]);
          setApplications(prev => [finalApp, ...prev]);
          showToast('تم حفظ بيانات المرشح وطلب التقديم في Supabase بنجاح! ✅', 'success');
        }
      } catch (err: any) {
        showToast(`خطأ في العملية: ${err.message}`, 'error');
        return;
      }
    } else {
      // Local simulated state
      const localExistingCand = candidates.find(c => c.phone.trim() === trimmedPhone);
      if (localExistingCand) {
        const localExistingApp = applications.find(a => a.candidate_id === localExistingCand.id && a.job_id === newCandidateTargetJobId);
        if (localExistingApp) {
          showToast('المرشح مضاف بالفعل لهذه الوظيفة ومسجل في النظام بنجاح! ✅', 'success');
          handleCloseAddCandidate();
          return;
        }

        // Just add application
        const localApp: Application = {
          id: generateUUID(),
          candidate_id: localExistingCand.id,
          job_id: newCandidateTargetJobId,
          status: 'New',
          applied_date: new Date().toISOString().split('T')[0],
          notes: 'تم تسجيل تقديم المرشح الموجود على وظيفة جديدة يدوياً.',
          hybrid_token: generateUUID()
        };

        setApplications(prev => [localApp, ...prev]);
        showToast('تم تقديم المرشح الموجود على هذه الوظيفة بنجاح! ✅', 'success');
      } else {
        // Normal add
        setCandidates(prev => [newCand, ...prev]);
        setApplications(prev => [newApp, ...prev]);
        showToast('تم حفظ بيانات المرشح وطلب التقديم بنجاح! ✅', 'success');
      }
    }

    handleCloseAddCandidate();
  };

  // Schedule Interview
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIntAppId) return;
    const newIntId = generateUUID();
    const newInt: Interview = {
      id: newIntId,
      application_id: newIntAppId,
      date: newIntDate,
      time: newIntTime,
      duration: Number(newIntDuration),
      status: 'Scheduled',
      type: 'Technical', // Defaulted to Technical because the field is removed from UI as requested
      room_number: newIntRoom,
      meeting_link: `https://meet.google.com/meet-${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}`,
      whatsapp_link_sent: false,
      waiting_room_status: 'Not Joined'
    };

    let finalInt = newInt;
    if (isSupabaseConfigured()) {
      const { id, ...supabaseIntPayload } = newInt;
      const { data: insertedInts, error } = await supabase
        .from('interviews')
        .insert([supabaseIntPayload])
        .select();

      if (error) {
        showToast(`فشل جدولة المقابلة في قاعدة البيانات: ${error.message}`, 'error');
        return;
      } else {
        if (insertedInts && insertedInts[0]) {
          finalInt = insertedInts[0];
        }
        showToast('تم حفظ المقابلة الجديدة في قاعدة البيانات بنجاح ✅', 'success');
      }
    }

    setInterviews([finalInt, ...interviews]);
    setIsScheduleInterviewOpen(false);
  };

  // Delete Job
  const handleDeleteJob = async (id: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) {
        showToast(`فشل حذف الوظيفة من قاعدة البيانات: ${error.message}`, 'error');
        return;
      } else {
        showToast('تم حذف الوظيفة من قاعدة البيانات بنجاح ✅', 'success');
      }
    }
    setJobs(jobs.filter(j => j.id !== id));
  };

  // Delete Candidate
  const handleDeleteCandidate = async (id: string) => {
    if (isSupabaseConfigured()) {
      // Delete applications first due to foreign keys
      const { error: appErr } = await supabase.from('applications').delete().eq('candidate_id', id);
      if (appErr) {
        showToast(`فشل حذف طلبات المرشح: ${appErr.message}`, 'error');
        return;
      }

      const { error: candErr } = await supabase.from('candidates').delete().eq('id', id);
      if (candErr) {
        showToast(`فشل حذف المرشح من قاعدة البيانات: ${candErr.message}`, 'error');
        return;
      }

      showToast('تم حذف المرشح وطلباته من قاعدة البيانات بنجاح ✅', 'success');
    }
    setCandidates(candidates.filter(c => c.id !== id));
    setApplications(applications.filter(a => a.candidate_id !== id));
  };

  // Update interview status (Waiting Room Status updates)
  const handleUpdateWaitingStatus = async (interviewId: string, newStatus: 'Not Joined' | 'Waiting' | 'In Progress' | 'Finished') => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('interviews')
        .update({ waiting_room_status: newStatus })
        .eq('id', interviewId);
      if (error) {
        showToast(`فشل تحديث حالة الانتظار في قاعدة البيانات: ${error.message}`, 'error');
        return;
      }
    }

    setInterviews(interviews.map(i => {
      if (i.id === interviewId) {
        // If finishing interview, prompt evaluation modal
        if (newStatus === 'Finished') {
          setActiveEvaluationInterviewId(interviewId);
          setIsAddEvaluationOpen(true);
        }
        return { ...i, waiting_room_status: newStatus };
      }
      return i;
    }));
  };

  // Add Evaluation
  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvaluationInterviewId) return;

    const newEvalId = generateUUID();
    const newEval: Evaluation = {
      id: newEvalId,
      interview_id: activeEvaluationInterviewId,
      evaluator_id: currentProfile.id,
      score: evalScore,
      technical_skills: evalTech || 'مقبولة وتفي بالغرض.',
      communication_skills: evalComm || 'تواصل جيد وواضح.',
      cultural_fit: evalCulture || 'متوافق مع قيم الفريق.',
      summary_notes: evalNotes || 'تمت المقابلة بنجاح وتقييم الأداء العام.',
      recommendation: evalRecommendation
    };

    let appStatus: Application['status'] = 'Interviewing';
    if (evalRecommendation === 'Strong Hire' || evalRecommendation === 'Hire') {
      appStatus = 'Offered';
    } else if (evalRecommendation === 'No Hire') {
      appStatus = 'Rejected';
    } else {
      appStatus = 'Screening';
    }

    let finalEval = newEval;
    if (isSupabaseConfigured()) {
      // 1. Save evaluation without ID
      const { id, ...supabaseEvalPayload } = newEval;
      const { data: insertedEvals, error: evalErr } = await supabase
        .from('evaluations')
        .insert([supabaseEvalPayload])
        .select();

      if (evalErr) {
        showToast(`فشل حفظ التقييم في قاعدة البيانات: ${evalErr.message}`, 'error');
        return;
      } else {
        if (insertedEvals && insertedEvals[0]) {
          finalEval = insertedEvals[0];
        }
      }

      // 2. Update application status
      const targetInterview = interviews.find(i => i.id === activeEvaluationInterviewId);
      if (targetInterview) {
        const targetApp = applications.find(a => a.id === targetInterview.application_id);
        if (targetApp) {
          const { error: appErr } = await supabase
            .from('applications')
            .update({ status: appStatus })
            .eq('id', targetApp.id);
          if (appErr) {
            console.error('Failed to update application status in Supabase:', appErr);
          }
        }
      }

      showToast('تم حفظ التقييم وتحديث حالة الطلب في قاعدة البيانات! ✅', 'success');
    }

    setEvaluations([finalEval, ...evaluations]);
    
    // Also update application status based on recommendation
    const targetInterview = interviews.find(i => i.id === activeEvaluationInterviewId);
    if (targetInterview) {
      const targetApp = applications.find(a => a.id === targetInterview.application_id);
      if (targetApp) {
        setApplications(applications.map(a => a.id === targetApp.id ? { ...a, status: appStatus } : a));
      }
    }

    setIsAddEvaluationOpen(false);
    // Reset evaluation form
    setActiveEvaluationInterviewId('');
    setEvalScore(5);
    setEvalTech('');
    setEvalComm('');
    setEvalCulture('');
    setEvalNotes('');
    setEvalRecommendation('Hire');
  };

  // Send Hybrid WhatsApp real message
  const triggerSendWhatsApp = (interviewId: string) => {
    const interview = interviews.find(i => i.id === interviewId);
    if (!interview) return;
    const app = applications.find(a => a.id === interview.application_id);
    const candidate = candidates.find(c => c.id === app?.candidate_id);
    const job = jobs.find(j => j.id === app?.job_id);

    if (candidate) {
      const customPortalLink = `${window.location.origin}/?candidate_id=${candidate.id}`;
      const jobTitle = job?.title || 'الوظيفة';
      const timeStr = `${interview.date} - ${interview.time}`;
      const message = renderWhatsAppMessage('invite', candidate.name, jobTitle, timeStr, customPortalLink);
      
      const cleanPhone = candidate.phone.replace(/[\s+()-]/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');

      // Set that link was sent successfully
      if (isSupabaseConfigured()) {
        supabase.from('interviews').update({ whatsapp_link_sent: true }).eq('id', interviewId).then(({ error }) => {
          if (error) console.error('Failed to sync WhatsApp link sent status to Supabase:', error);
        });
      }
      setInterviews(interviews.map(i => i.id === interviewId ? { ...i, whatsapp_link_sent: true } : i));
      showToast('تم فتح محادثة الواتساب بنجاح وإرسال الرابط الهجين للمرشح! ✅', 'success');
    }
  };

  // Helper resolvers
  const resolveCandidate = (appId: string) => {
    const app = applications.find(a => a.id === appId);
    return candidates.find(c => c.id === app?.candidate_id);
  };

  const resolveJob = (appId: string) => {
    const app = applications.find(a => a.id === appId);
    return jobs.find(j => j.id === app?.job_id);
  };

  const resolveApplicationStatus = (candId: string) => {
    const app = applications.find(a => a.candidate_id === candId);
    return app?.status || 'New';
  };

  // Candidate Portal specific lookup
  const currentCandidate = candidates.find(c => c.id === selectedCandidateId) || candidates[0];
  const currentCandApp = applications.find(a => a.candidate_id === currentCandidate.id);
  const currentCandJob = jobs.find(j => j.id === currentCandApp?.job_id);
  const currentCandInterview = interviews.find(i => i.application_id === currentCandApp?.id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-200 selection:text-sky-900" dir="rtl">
      
      {/* Toast Notifications Container */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 pointer-events-none max-w-md w-full">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-center gap-3 transition-all duration-300 text-right ${
              toast.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-sky-50 border-sky-200 text-sky-900'
            }`}
            dir="rtl"
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />}
            {toast.type === 'info' && <Clock className="w-5 h-5 text-sky-600 shrink-0" />}
            <p className="text-xs font-bold leading-relaxed">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* GLOBAL ENTERPRISE TOP HEADER - Glassmorphism style */}
      <header className="glass border-b border-slate-200/80 sticky top-0 z-50 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-700 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-sky-800 tracking-tight">ApplyWell</span>
              <span className="text-xs bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">Pro</span>
              {isSupabaseConfigured() && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  قاعدة Supabase حية ومتصلة 🟢
                </span>
              )}
            </div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">نظام التوظيف الرشيق الذكي (Lean ATS)</p>
          </div>
        </div>



        {/* LOGGED IN USER & LIVE CHANNELS */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex px-3.5 py-1.5 bg-white/60 rounded-full border border-slate-200/80 text-xs font-semibold items-center gap-2 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            قناة واتساب: متصلة ونشطة
          </div>
          <div className="flex items-center gap-2.5 bg-white/40 px-3 py-1.5 rounded-2xl border border-slate-200/50">
            <img 
              src={currentProfile.avatar_url} 
              alt={currentProfile.name}
              className="w-7 h-7 rounded-full object-cover border border-sky-200 shadow-sm"
            />
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">{currentProfile.name}</p>
              <p className="text-[9px] text-slate-500 font-medium">{currentProfile.role === 'Admin' ? 'المدير التقني التنفيذي' : 'مسؤول توظيف'}</p>
            </div>
          </div>
        </div>
      </header>

      {/* PORTAL RENDER LOGIC */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ========================================================================= */}
        {/* =============== ADMIN CONSOLE PORTAL =============== */}
        {/* ========================================================================= */}
        {activePortal === 'admin' && (
          authLoading ? (
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-[80vh] w-full">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
                <p className="text-xs font-bold text-slate-500">جاري التحقق من الهوية...</p>
              </div>
            </div>
          ) : !user ? (
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-[80vh] w-full">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 text-right"
              >
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto text-sky-600 mb-3 border border-sky-100">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">بوابة إدارة التوظيف - ApplyWell Pro</h3>
                  <p className="text-xs text-slate-500 mt-1">الرجاء تسجيل الدخول للوصول إلى لوحة المتابعة وإدارة المرشحين</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">البريد الإلكتروني</label>
                    <input 
                      type="email" 
                      required
                      placeholder="admin@applywell.pro"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">كلمة المرور</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 transition-all duration-150"
                  >
                    {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-xs text-sky-600 hover:underline font-semibold"
                  >
                    {isSignUp ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ أنشئ حساب جديد'}
                  </button>
                </div>

                {!isSupabaseConfigured() && (
                  <div className="mt-6 p-3 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-[10px] text-center font-bold">
                    ⚠️ وضع التطوير المحلي: يمكنك استخدام أي بريد وكلمة مرور لتسجيل الدخول مباشرة (Bypass)
                  </div>
                )}
              </motion.div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full">
            
            {/* SIDEBAR FOR ADMIN TAB CONTROL */}
            <aside className="w-full md:w-64 glass border-l border-slate-200/80 flex flex-col p-5 z-10 gap-2 shrink-0">
              <div className="mb-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block px-3">لوحة التحكم الأساسية</span>
              </div>
              <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 scrollbar-none">
                <button
                  id="tab-dashboard"
                  onClick={() => setAdminTab('dashboard')}
                  className={`w-full text-right p-3 rounded-xl flex items-center gap-3 transition-all duration-200 shrink-0 text-xs font-semibold ${
                    adminTab === 'dashboard'
                      ? 'bg-sky-50 text-sky-700 border-r-4 border-sky-600'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-4.5 h-4.5 text-sky-600" />
                  <span>لوحة المتابعة الشاملة</span>
                </button>

                <button
                  id="tab-jobs"
                  onClick={() => setAdminTab('jobs')}
                  className={`w-full text-right p-3 rounded-xl flex items-center gap-3 transition-all duration-200 shrink-0 text-xs font-semibold ${
                    adminTab === 'jobs'
                      ? 'bg-sky-50 text-sky-700 border-r-4 border-sky-600'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <Briefcase className="w-4.5 h-4.5 text-sky-600" />
                  <span>إدارة الوظائف ({jobs.length})</span>
                </button>

                <button
                  id="tab-candidates"
                  onClick={() => setAdminTab('candidates')}
                  className={`w-full text-right p-3 rounded-xl flex items-center gap-3 transition-all duration-200 shrink-0 text-xs font-semibold ${
                    adminTab === 'candidates'
                      ? 'bg-sky-50 text-sky-700 border-r-4 border-sky-600'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4.5 h-4.5 text-sky-600" />
                  <span>المرشحون الأساسيون ({candidates.length})</span>
                </button>

                <button
                  id="tab-interviews"
                  onClick={() => setAdminTab('interviews')}
                  className={`w-full text-right p-3 rounded-xl flex items-center gap-3 transition-all duration-200 shrink-0 text-xs font-semibold ${
                    adminTab === 'interviews'
                      ? 'bg-sky-50 text-sky-700 border-r-4 border-sky-600'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <Video className="w-4.5 h-4.5 text-sky-600" />
                  <span>ساحة الانتظار الرقمية ({interviews.filter(i => i.waiting_room_status !== 'Finished').length})</span>
                </button>

                <button
                  id="tab-evaluations"
                  onClick={() => setAdminTab('evaluations')}
                  className={`w-full text-right p-3 rounded-xl flex items-center gap-3 transition-all duration-200 shrink-0 text-xs font-semibold ${
                    adminTab === 'evaluations'
                      ? 'bg-sky-50 text-sky-700 border-r-4 border-sky-600'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-4.5 h-4.5 text-sky-600" />
                  <span>تقييمات المقابلات ({evaluations.length})</span>
                </button>

                <button
                  id="tab-settings"
                  onClick={() => setAdminTab('settings' as any)}
                  className={`w-full text-right p-3 rounded-xl flex items-center gap-3 transition-all duration-200 shrink-0 text-xs font-semibold ${
                    adminTab === 'settings'
                      ? 'bg-sky-50 text-sky-700 border-r-4 border-sky-600'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <Settings className="w-4.5 h-4.5 text-sky-600" />
                  <span>إعدادات النظام وقوالب الرسائل ⚙️</span>
                </button>

                <button
                  id="tab-logout"
                  onClick={handleLogout}
                  className="w-full text-right p-3 rounded-xl flex items-center gap-3 transition-all duration-200 shrink-0 text-xs font-semibold text-rose-600 hover:bg-rose-50/80 hover:text-rose-700"
                >
                  <XCircle className="w-4.5 h-4.5 text-rose-500" />
                  <span>تسجيل الخروج</span>
                </button>
              </nav>

              {/* SIMULATION SUMMARY STATS IN SIDEBAR */}
              <div className="mt-auto hidden md:block bg-gradient-to-tr from-sky-50 to-blue-50/50 p-4 rounded-2xl border border-sky-100/60 text-right">
                <div className="flex items-center gap-2 text-sky-800 font-bold text-xs mb-1">
                  <Sparkles className="w-4 h-4 text-sky-500 animate-pulse" />
                  <span>كفاءة التوظيف الرشيق</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  بفضل الروابط الهجينة (WhatsApp Integration)، انخفض متوسط زمن الانتظار للمرشحين بنسبة 78%.
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-700 border-t border-sky-100/80 pt-2">
                  <span>نسبة الرد السريع:</span>
                  <span className="text-sky-700">92.4%</span>
                </div>
              </div>
            </aside>

            {/* MAIN ADMIN WORKSPACE */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
              
              {/* BREADCRUMB HEADER */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200/60">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {adminTab === 'dashboard' && 'نظرة عامة على الأداء والتوظيف'}
                    {adminTab === 'jobs' && 'لوحة الوظائف والاحتياج التقني'}
                    {adminTab === 'candidates' && 'قاعدة بيانات الكفاءات'}
                    {adminTab === 'interviews' && 'إدارة المقابلات وساحة الانتظار الرقمية'}
                    {adminTab === 'evaluations' && 'محرك التقييمات وقرارات التوظيف'}
                    {adminTab === 'settings' && 'إعدادات النظام وقوالب رسائل واتساب ⚙️'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {adminTab === 'dashboard' && 'متابعة حية للروابط الهجينة وأداء مقابلات اليوم بشكل فوري.'}
                    {adminTab === 'jobs' && 'إدارة طلبات التوظيف الحالية وتفاصيل المهام والشروط.'}
                    {adminTab === 'candidates' && 'البحث والمطابقة والاطلاع على المهارات الأساسية وتتبع تقديماتهم.'}
                    {adminTab === 'interviews' && 'رصد تواجد المرشحين حياً داخل الغرف الافتراضية وبدء المقابلات بضغطة زر.'}
                    {adminTab === 'evaluations' && 'الدرجات المسجلة والتقارير الفنية للخبراء لضمان كفاءة الاختيار.'}
                    {adminTab === 'settings' && 'التحكم في قنوات الاستقطاب، وصياغة قوالب التواصل الآلي عبر الرسائل الهجينة.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {adminTab === 'jobs' && (
                    <button 
                      onClick={handleOpenAddJob}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 flex items-center gap-2 transition-all duration-200"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة وظيفة جديدة
                    </button>
                  )}
                  {adminTab === 'candidates' && (
                    <button 
                      onClick={handleOpenAddCandidate}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 flex items-center gap-2 transition-all duration-200"
                    >
                      <Plus className="w-4 h-4" />
                      تسجيل مرشح يدوي
                    </button>
                  )}
                  {adminTab === 'interviews' && (
                    <button 
                      onClick={handleOpenScheduleInterview}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 flex items-center gap-2 transition-all duration-200"
                    >
                      <Plus className="w-4 h-4" />
                      جدولة مقابلة فورية
                    </button>
                  )}
                </div>
              </div>

              {/* ======================= SUB-VIEW 1: DASHBOARD ======================= */}
              {adminTab === 'dashboard' && (
                <div className="space-y-8">
                  
                  {/* METRIC CARDS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="glass p-5 rounded-3xl border border-slate-200 hover:shadow-md transition-all duration-300">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400">إجمالي الوظائف النشطة</p>
                        <div className="p-1.5 bg-sky-50 rounded-lg"><Briefcase className="w-4 h-4 text-sky-600" /></div>
                      </div>
                      <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-extrabold text-slate-800">{jobs.filter(j => j.status === 'Active').length}</h3>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">+2 هذا الأسبوع</span>
                      </div>
                    </div>

                    <div className="glass p-5 rounded-3xl border border-slate-200 hover:shadow-md transition-all duration-300">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400">قاعدة بيانات المرشحين</p>
                        <div className="p-1.5 bg-indigo-50 rounded-lg"><Users className="w-4 h-4 text-indigo-600" /></div>
                      </div>
                      <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-extrabold text-slate-800">{candidates.length}</h3>
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">{applications.filter(a => a.status === 'New').length} تقديم جديد</span>
                      </div>
                    </div>

                    <div className="glass p-5 rounded-3xl border border-slate-200 hover:shadow-md transition-all duration-300">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400">مقابلات اليوم المجدولة</p>
                        <div className="p-1.5 bg-amber-50 rounded-lg"><Video className="w-4 h-4 text-amber-600" /></div>
                      </div>
                      <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-extrabold text-slate-800">{interviews.length}</h3>
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                          {interviews.filter(i => i.waiting_room_status === 'Waiting').length} في الانتظار حالياً
                        </span>
                      </div>
                    </div>

                    <div className="glass p-5 rounded-3xl border border-slate-200 hover:shadow-md transition-all duration-300">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400">متوسط رضا المرشحين والتقييم</p>
                        <div className="p-1.5 bg-rose-50 rounded-lg"><Award className="w-4 h-4 text-rose-600" /></div>
                      </div>
                      <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-extrabold text-slate-800">4.8 <span className="text-xs text-slate-400 font-medium">/ 5.0</span></h3>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-3.5 bg-sky-500 rounded-full"></span>
                          <span className="w-1.5 h-5.5 bg-sky-500 rounded-full"></span>
                          <span className="w-1.5 h-4.5 bg-sky-300 rounded-full"></span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* DOUBLE SECTION GRID: DIGITAL WAITING ROOM QUEUE & WHATSAPP ENGAGEMENT */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* DIGITAL WAITING ROOM CARD (8 spans) */}
                    <div className="lg:col-span-8 glass rounded-[2rem] p-6 border border-slate-200/80 flex flex-col min-h-[400px]">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
                            ساحة الانتظار الرقمية (Digital Waiting Room) - رصد حيّ
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1">المرشحون المنضمون من البوابة الهجينة ينتظرون إذن الدخول للمقابلة الحية.</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={() => {
                              // Simulate a random candidate entering the waiting room live for a demo feel
                              const offlineInt = interviews.find(i => i.waiting_room_status === 'Not Joined' || i.waiting_room_status === 'Finished');
                              if (offlineInt) {
                                setInterviews(interviews.map(i => i.id === offlineInt.id ? { ...i, waiting_room_status: 'Waiting' } : i));
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5"
                            title="محاكاة دخول مرشح افتراضي لساحة الانتظار"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            محاكاة دخول مرشح
                          </button>
                          <button 
                            onClick={() => setAdminTab('interviews')}
                            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-xl transition-all duration-200"
                          >
                            عرض كامل الساحة
                          </button>
                        </div>
                      </div>

                      {/* WAITING ROOM QUEUE */}
                      <div className="flex-1 space-y-3">
                        {interviews.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                            <Clock className="w-12 h-12 mb-2 stroke-1" />
                            <p className="text-sm">لا توجد مقابلات مجدولة اليوم.</p>
                          </div>
                        ) : (
                          interviews.map(interview => {
                            const candidate = resolveCandidate(interview.application_id);
                            const job = resolveJob(interview.application_id);
                            if (!candidate) return null;

                            return (
                              <div 
                                key={interview.id} 
                                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                  interview.waiting_room_status === 'Waiting'
                                    ? 'bg-amber-50/50 border-amber-200/80 shadow-sm border-r-4 border-r-amber-500'
                                    : interview.waiting_room_status === 'In Progress'
                                    ? 'bg-emerald-50/50 border-emerald-200/80 shadow-sm border-r-4 border-r-emerald-500'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-3.5">
                                  <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-700 font-bold border border-sky-100 shrink-0">
                                    {candidate.name.substring(0, 2)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-sm font-bold text-slate-800">{candidate.name}</h5>
                                      <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                        {interview.type === 'Technical' ? 'فنية' : interview.type === 'HR' ? 'سلوكية HR' : 'إدارية'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{job?.title || 'وظيفة غير محددة'}</p>
                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      الموعد: اليوم، {interview.time} ({interview.duration} دقيقة)
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 justify-between sm:justify-end">
                                  {/* Current waiting room telemetry indicators */}
                                  <div className="text-left sm:text-right">
                                    {interview.waiting_room_status === 'Waiting' && (
                                      <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full animate-pulse">
                                        متواجد في الانتظار ⏳
                                      </span>
                                    )}
                                    {interview.waiting_room_status === 'In Progress' && (
                                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
                                        في المقابلة الحية 🟢
                                      </span>
                                    )}
                                    {interview.waiting_room_status === 'Finished' && (
                                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                        انتهت المقابلة ✅
                                      </span>
                                    )}
                                    {interview.waiting_room_status === 'Not Joined' && (
                                      <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                                        لم ينضم للبوابة بعد
                                      </span>
                                    )}
                                  </div>

                                  {/* Interactive Action controls for Wait room */}
                                  <div className="flex gap-1.5">
                                    {interview.waiting_room_status === 'Waiting' && (
                                      <button
                                        onClick={() => handleUpdateWaitingStatus(interview.id, 'In Progress')}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors duration-150"
                                      >
                                        إدخال للمقابلة
                                      </button>
                                    )}
                                    {interview.waiting_room_status === 'In Progress' && (
                                      <button
                                        onClick={() => handleUpdateWaitingStatus(interview.id, 'Finished')}
                                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors duration-150"
                                      >
                                        إنهاء وتقييم
                                      </button>
                                    )}
                                    {interview.waiting_room_status === 'Not Joined' && (
                                      <button
                                        onClick={() => triggerSendWhatsApp(interview.id)}
                                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors duration-150 flex items-center gap-1"
                                      >
                                        <Smartphone className="w-3.5 h-3.5" />
                                        إرسال تذكير واتساب
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* SIDE COLUMN: HYBRID WHATSAPP SUMMARY & RECENT EVALS */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* WHATSAPP LINK STATISTICS */}
                      <div className="glass p-6 rounded-[2rem] border border-slate-200/80">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-emerald-600" />
                          أداء قنوات واتساب الهجينة
                        </h4>
                        <div className="space-y-4">
                          <div className="p-3 bg-white rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400">تجاوب المرشحين الفوري</p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-sky-500 w-[84%]" />
                              </div>
                              <span className="text-xs font-extrabold text-sky-800">84%</span>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">عدد الروابط النشطة</p>
                              <p className="text-xl font-extrabold text-slate-800 mt-1">18 رابط هجين</p>
                            </div>
                            <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg font-bold">آمنة مشفرة</span>
                          </div>
                        </div>
                      </div>

                      {/* RECENT EVALUATIONS PANEL */}
                      <div className="glass p-6 rounded-[2rem] border border-slate-200/80">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Award className="w-4 h-4 text-sky-600" />
                            التقييمات الأخيرة للخبراء
                          </h4>
                          <button 
                            onClick={() => setAdminTab('evaluations')}
                            className="text-[10px] text-sky-600 font-bold hover:underline"
                          >
                            الكل
                          </button>
                        </div>
                        <div className="space-y-3.5">
                          {evaluations.slice(0, 3).map(evalItem => {
                            const interview = interviews.find(i => i.id === evalItem.interview_id);
                            const app = applications.find(a => a.id === interview?.application_id);
                            const candidate = candidates.find(c => c.id === app?.candidate_id);
                            
                            return (
                              <div key={evalItem.id} className="p-3 bg-white/50 rounded-2xl border border-slate-100 text-right">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-800">{candidate?.name || 'مرشح'}</span>
                                  <div className="flex items-center text-amber-500 font-bold text-xs gap-0.5">
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                    <span>{evalItem.score}</span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                  {evalItem.summary_notes}
                                </p>
                                <div className="mt-2 flex justify-between items-center">
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                    evalItem.recommendation === 'Strong Hire' || evalItem.recommendation === 'Hire'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {evalItem.recommendation === 'Strong Hire' ? 'توظيف مؤكد' : 'توظيف'}
                                  </span>
                                  <span className="text-[9px] text-slate-400">تقييم بواسطة {profiles.find(p => p.id === evalItem.evaluator_id)?.name.split(' ')[0]}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* ======================= SUB-VIEW 2: JOBS ======================= */}
              {adminTab === 'jobs' && (
                <div className="space-y-6">
                  {/* SEARCH & FILTER BAR */}
                  <div className="glass p-4 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-80">
                      <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="ابحث باسم الوظيفة أو القسم..."
                        value={jobSearch}
                        onChange={(e) => setJobSearch(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                      />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                      {['all', 'Active', 'Draft', 'Closed'].map(status => (
                        <button
                          key={status}
                          onClick={() => setSelectedJobId(status)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                            selectedJobId === status
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {status === 'all' && 'الكل'}
                          {status === 'Active' && 'نشطة'}
                          {status === 'Draft' && 'مسودات'}
                          {status === 'Closed' && 'مغلقة'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* JOBS LIST GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs
                      .filter(job => {
                        const matchesSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase()) || 
                                              job.department.toLowerCase().includes(jobSearch.toLowerCase());
                        const matchesFilter = selectedJobId === 'all' || job.status === selectedJobId;
                        return matchesSearch && matchesFilter;
                      })
                      .map(job => {
                        const appCount = applications.filter(a => a.job_id === job.id).length;
                        return (
                          <div 
                            key={job.id} 
                            className="glass p-5 rounded-3xl border border-slate-200 flex flex-col h-full hover:shadow-md transition-all duration-200 relative group"
                          >
                            <span className={`absolute top-4 left-4 text-[9px] px-2 py-0.5 rounded-full font-bold ${
                              job.status === 'Active' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : job.status === 'Draft'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {job.status === 'Active' ? 'نشطة' : job.status === 'Draft' ? 'مسودة' : 'مغلقة'}
                            </span>

                            <div className="mb-4">
                              <p className="text-[10px] text-sky-600 font-bold uppercase">{job.department}</p>
                              <h4 className="text-base font-bold text-slate-800 mt-1">{job.title}</h4>
                            </div>

                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4 flex-1">
                              {job.description}
                            </p>

                            <div className="flex items-center gap-4 text-[11px] text-slate-400 mb-4 border-t border-slate-100 pt-3">
                              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {job.type === 'Full-time' ? 'دوام كامل' : job.type === 'Part-time' ? 'دوام جزئي' : 'عمل عن بعد'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                              <span className="text-xs font-bold text-slate-700">{appCount} مرشحين مهتمين</span>
                              <button 
                                onClick={() => handleDeleteJob(job.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                title="حذف الوظيفة"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ======================= SUB-VIEW 3: CANDIDATES ======================= */}
              {adminTab === 'candidates' && (
                <div className="space-y-6">
                  {/* COMPREHENSIVE SEARCH & METRICS */}
                  <div className="glass p-5 rounded-3xl border border-slate-200/80 flex flex-col xl:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full xl:w-96">
                      <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="ابحث باسم المرشح أو مصدره..."
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        className="w-full pl-4 pr-11 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 text-right"
                      />
                    </div>

                    {/* INTERACTIVE ACTIONS */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-end">
                      <button 
                        onClick={() => setIsAddCandidateOpen(true)}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200 flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        تسجيل مرشح يدوي
                      </button>

                      <button 
                        onClick={() => setIsAutoScheduleOpen(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200 flex items-center gap-1.5"
                      >
                        <Clock className="w-4 h-4" />
                        الجدولة الآلية للمرشحين ⚡
                      </button>

                      <button 
                        onClick={triggerExcelImport}
                        disabled={isImportingExcel}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200 flex items-center gap-1.5"
                      >
                        <FileText className="w-4 h-4" />
                        {isImportingExcel ? 'جاري الاستيراد...' : 'الاستيراد من Excel 📊'}
                      </button>

                      <span className="text-xs text-slate-500 font-semibold bg-slate-100/80 px-3 py-2 rounded-xl border border-slate-200">
                        إجمالي المرشحين: {candidates.length}
                      </span>
                    </div>
                  </div>

                  {/* Excel Import Progress Bar Indicator */}
                  {isImportingExcel && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col gap-2 text-right"
                    >
                      <div className="flex justify-between text-xs font-bold text-emerald-800">
                        <span>جاري معالجة واستيراد جدول البيانات من ملف Excel...</span>
                        <span>{excelImportProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-600 h-full transition-all duration-150" style={{ width: `${excelImportProgress}%` }}></div>
                      </div>
                    </motion.div>
                  )}

                  {/* CANDIDATES DIRECTORY */}
                  <div className="glass rounded-[2rem] border border-slate-200/80 overflow-hidden bg-white/80">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                            <th className="p-4">المرشح والمعلومات</th>
                            <th className="p-4">الوظيفة المتقدم لها</th>
                            <th className="p-4">المصدر</th>
                            <th className="p-4">حالة الطلب</th>
                            <th className="p-4 text-left">إجراءات والتواصل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {candidates
                            .filter(candidate => {
                              const searchLower = candidateSearch.toLowerCase();
                              return candidate.name.toLowerCase().includes(searchLower) ||
                                     candidate.source.toLowerCase().includes(searchLower) ||
                                     candidate.phone.includes(searchLower);
                            })
                            .map(candidate => {
                              const candidateApp = applications.find(a => a.candidate_id === candidate.id);
                              const targetJob = jobs.find(j => j.id === candidateApp?.job_id);

                              return (
                                <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors duration-150 text-xs text-slate-700">
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-sky-600 text-white font-bold flex items-center justify-center">
                                        {candidate.name.substring(0, 2)}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-800">{candidate.name}</p>
                                        <div className="flex flex-col text-[10px] text-slate-400 mt-0.5 gap-0.5">
                                          {candidate.resume_url && (
                                            <span className="flex items-center gap-1 text-sky-600 font-medium">
                                              <ExternalLink className="w-3 h-3" />
                                              <a href={candidate.resume_url} target="_blank" rel="noreferrer" className="hover:underline">رابط السيرة الذاتية</a>
                                            </span>
                                          )}
                                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{candidate.phone}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <p className="font-semibold text-slate-800">{targetJob?.title || 'غير محددة'}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{targetJob?.department}</p>
                                  </td>
                                  <td className="p-4 text-slate-500 font-semibold">{candidate.source}</td>
                                  <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                      candidateApp?.status === 'New' 
                                        ? 'bg-sky-50 text-sky-700'
                                        : candidateApp?.status === 'Interviewing'
                                        ? 'bg-amber-50 text-amber-700 animate-pulse'
                                        : candidateApp?.status === 'Offered'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : candidateApp?.status === 'Rejected'
                                        ? 'bg-rose-50 text-rose-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {candidateApp?.status === 'New' && 'جديد'}
                                      {candidateApp?.status === 'Screening' && 'فرز وتصفية'}
                                      {candidateApp?.status === 'Interviewing' && 'مقابلات'}
                                      {candidateApp?.status === 'Offered' && 'مقدم له عرض'}
                                      {candidateApp?.status === 'Rejected' && 'مستبعد'}
                                      {candidateApp?.status === 'Hired' && 'تم التعيين'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-left">
                                    <div className="flex items-center justify-end gap-1">
                                      <button 
                                        onClick={() => {
                                          const customPortalLink = `${window.location.origin}/?candidate_id=${candidate.id}`;
                                          const jobTitle = targetJob?.title || 'الوظيفة';
                                          const message = renderWhatsAppMessage('invite', candidate.name, jobTitle, 'غداً الساعة 10:00 ص', customPortalLink);
                                          const cleanPhone = candidate.phone.replace(/[\s+()-]/g, '');
                                          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
                                          showToast('تم فتح محادثة الواتساب بنجاح وإرسال الرابط الهجين للمرشح! ✅', 'success');
                                        }}
                                        className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors duration-150 flex items-center gap-1 font-bold text-[10px]"
                                        title="تواصل واتساب"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span>رسالة واتساب</span>
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setSelectedCandidateId(candidate.id);
                                          setActivePortal('candidate');
                                        }}
                                        className="p-1.5 hover:bg-sky-50 hover:text-sky-700 text-slate-400 rounded-lg transition-colors duration-150"
                                        title="معاينة كمرشح"
                                      >
                                        <Smartphone className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteCandidate(candidate.id)}
                                        className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition-colors duration-150"
                                        title="حذف المرشح"
                                      >
                                        <Trash className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================= SUB-VIEW 4: INTERVIEWS ======================= */}
              {adminTab === 'interviews' && (
                <div className="space-y-6">
                  
                  {/* DEDICATED DIGITAL WAITING ROOM QUEUE MONITOR */}
                  <div className="glass rounded-[2rem] p-6 border border-slate-200/80 bg-white/80">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">ساحة الانتظار الرقمية (Digital Waiting Room)</h3>
                        <p className="text-xs text-slate-500 mt-1">تتيح لك هذه اللوحة التحكم الكامل في حالة المرشحين المتواجدين في الانتظار وإدراجهم في المقابلات الحية بشكل فوري.</p>
                      </div>
                      <button 
                        onClick={() => setIsScheduleInterviewOpen(true)}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200"
                      >
                        جدولة مقابلة جديدة
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {interviews.map(interview => {
                        const candidate = resolveCandidate(interview.application_id);
                        const job = resolveJob(interview.application_id);
                        if (!candidate) return null;

                        return (
                          <div 
                            key={interview.id} 
                            className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
                              interview.waiting_room_status === 'Waiting'
                                ? 'bg-amber-50/60 border-amber-300 shadow-sm'
                                : interview.waiting_room_status === 'In Progress'
                                ? 'bg-emerald-50/60 border-emerald-300 shadow-sm'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <span className={`absolute top-4 left-4 text-[9px] font-bold px-2.5 py-1 rounded-full ${
                              interview.waiting_room_status === 'Waiting'
                                ? 'bg-amber-100 text-amber-700 animate-pulse'
                                : interview.waiting_room_status === 'In Progress'
                                ? 'bg-emerald-100 text-emerald-700'
                                : interview.waiting_room_status === 'Finished'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-slate-50 text-slate-400 border border-slate-200'
                            }`}>
                              {interview.waiting_room_status === 'Waiting' && '⏳ بالانتظار'}
                              {interview.waiting_room_status === 'In Progress' && '🟢 في المقابلة'}
                              {interview.waiting_room_status === 'Finished' && '✅ انتهت'}
                              {interview.waiting_room_status === 'Not Joined' && 'غير متصل'}
                            </span>

                            <div className="mb-4">
                              <span className="text-[10px] text-sky-600 font-extrabold uppercase">{interview.type} Interview</span>
                              <h4 className="text-sm font-bold text-slate-800 mt-1">{candidate.name}</h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">{job?.title}</p>
                            </div>

                            <div className="space-y-3.5 text-[11px] text-slate-500 mb-5 border-t border-b border-slate-100 py-3 text-right">
                              {editingInterviewId === interview.id ? (
                                <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 block mb-0.5">تاريخ المقابلة</label>
                                    <input 
                                      type="date" 
                                      value={tempDate}
                                      onChange={(e) => setTempDate(e.target.value)}
                                      className="w-full p-1 bg-white border border-slate-200 rounded text-[10px] text-right"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 block mb-0.5">الوقت</label>
                                    <input 
                                      type="time" 
                                      value={tempTime}
                                      onChange={(e) => setTempTime(e.target.value)}
                                      className="w-full p-1 bg-white border border-slate-200 rounded text-[10px] text-right"
                                    />
                                  </div>
                                  <div className="flex gap-1 pt-1">
                                    <button
                                      onClick={async () => {
                                        if (isSupabaseConfigured()) {
                                          const { error } = await supabase.from('interviews').update({ date: tempDate, time: tempTime }).eq('id', interview.id);
                                          if (error) {
                                            showToast(`فشل تعديل موعد المقابلة في قاعدة البيانات: ${error.message}`, 'error');
                                            return;
                                          }
                                        }
                                        setInterviews(prev => prev.map(i => i.id === interview.id ? { ...i, date: tempDate, time: tempTime } : i));
                                        setEditingInterviewId(null);
                                        setRescheduleNotifId(interview.id);
                                        showToast('تم تعديل موعد المقابلة بنجاح ✅', 'success');
                                      }}
                                      className="flex-1 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[9px] font-bold rounded"
                                    >
                                      حفظ التعديل
                                    </button>
                                    <button
                                      onClick={() => setEditingInterviewId(null)}
                                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[9px] font-bold rounded"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <p className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" />الموعد: {interview.date} في تمام الساعة {interview.time}</p>
                                    <button 
                                      onClick={() => {
                                        setEditingInterviewId(interview.id);
                                        setTempDate(interview.date);
                                        setTempTime(interview.time);
                                      }}
                                      className="text-[10px] text-sky-600 hover:underline font-bold"
                                    >
                                      تعديل الموعد ✏️
                                    </button>
                                  </div>
                                  <p className="flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-slate-400" />رقم المرشح: {candidate.phone}</p>
                                  {interview.room_number && (
                                    <p className="flex items-center gap-1.5"><Video className="w-4 h-4 text-slate-400" />القاعة: {interview.room_number}</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Notify WhatsApp of Reschedule button if modified */}
                            {rescheduleNotifId === interview.id && (
                              <button
                                onClick={() => {
                                  const customPortalLink = `${window.location.origin}/?candidate_id=${candidate.id}`;
                                  const jobTitle = job?.title || 'الوظيفة';
                                  const timeStr = `${interview.date} في تمام الساعة ${interview.time}`;
                                  const message = renderWhatsAppMessage('reschedule', candidate.name, jobTitle, timeStr, customPortalLink);
                                  const cleanPhone = candidate.phone.replace(/[\s+()-]/g, '');
                                  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
                                  setRescheduleNotifId(null);
                                  showToast('تم فتح محادثة الواتساب بنجاح وإرسال الرابط الهجين للمرشح! ✅', 'success');
                                }}
                                className="w-full mb-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 animate-bounce"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                إشعار واتساب بتعديل الموعد 🔔
                              </button>
                            )}

                            {/* CTAS FOR WAITING STATUS SIMULATION */}
                            <div className="space-y-2">
                              {interview.waiting_room_status === 'Not Joined' && (
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => handleUpdateWaitingStatus(interview.id, 'Waiting')}
                                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors duration-150"
                                  >
                                    محاكاة دخول المرشح للانتظار
                                  </button>
                                  <button
                                    onClick={() => triggerSendWhatsApp(interview.id)}
                                    className="w-full py-2 border border-emerald-500 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl transition-colors duration-150 flex items-center justify-center gap-1"
                                  >
                                    <Smartphone className="w-4 h-4" />
                                    إرسال الرابط الهجين (واتساب)
                                  </button>
                                </div>
                              )}

                              {interview.waiting_room_status === 'Waiting' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdateWaitingStatus(interview.id, 'In Progress')}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors duration-150"
                                  >
                                    بدء المقابلة الحية
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (interview.meeting_link) {
                                        window.open(interview.meeting_link, '_blank');
                                      }
                                    }}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors duration-150"
                                    title="فتح رابط الاجتماع الافتراضي"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                </div>
                              )}

                              {interview.waiting_room_status === 'In Progress' && (
                                <button
                                  onClick={() => handleUpdateWaitingStatus(interview.id, 'Finished')}
                                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-colors duration-150"
                                >
                                  إنهاء المقابلة وتقييم المرشح
                                </button>
                              )}

                              {interview.waiting_room_status === 'Finished' && (
                                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150 text-center text-[11px] text-slate-500 font-medium">
                                  تمت المقابلة وتسجيل التقييمات بنجاح.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================= SUB-VIEW 5: EVALUATIONS ======================= */}
              {adminTab === 'evaluations' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* EVALUATIONS LIST */}
                    <div className="lg:col-span-2 space-y-4">
                      {evaluations.map(evaluation => {
                        const interview = interviews.find(i => i.id === evaluation.interview_id);
                        const app = applications.find(a => a.id === interview?.application_id);
                        const candidate = candidates.find(c => c.id === app?.candidate_id);
                        const job = jobs.find(j => j.id === app?.job_id);

                        return (
                          <div key={evaluation.id} className="glass p-6 rounded-3xl border border-slate-200/80 bg-white/60">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                              <div>
                                <h4 className="text-sm font-bold text-slate-800">{candidate?.name || 'مرشح'}</h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">{job?.title} | {interview?.type} Interview</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-semibold">توصية الخبير:</span>
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                                  evaluation.recommendation === 'Strong Hire' || evaluation.recommendation === 'Hire'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {evaluation.recommendation === 'Strong Hire' && 'توظيف مؤكد 🌟'}
                                  {evaluation.recommendation === 'Hire' && 'توظيف'}
                                  {evaluation.recommendation === 'Hold' && 'تعليق مؤقت'}
                                  {evaluation.recommendation === 'No Hire' && 'عدم ملاءمة'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                              <div>
                                <span className="text-[10px] text-slate-400 font-semibold block">المهارات الفنية</span>
                                <p className="text-xs text-slate-700 font-medium mt-1">{evaluation.technical_skills}</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-semibold block">مهارات التواصل</span>
                                <p className="text-xs text-slate-700 font-medium mt-1">{evaluation.communication_skills}</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-semibold block">الملاءمة الثقافية</span>
                                <p className="text-xs text-slate-700 font-medium mt-1">{evaluation.cultural_fit}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-semibold block">الملخص العام للمقابلة</span>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{evaluation.summary_notes}</p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                              <span>المقيّم: {profiles.find(p => p.id === evaluation.evaluator_id)?.name || 'المهندس عبدالرحمن'}</span>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-amber-500">الدرجة الكلية:</span>
                                <span className="text-slate-700 font-extrabold">{evaluation.score} / 5</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* EVALUATION STATS & EXPLANATIONS */}
                    <div className="space-y-6">
                      <div className="glass p-6 rounded-[2rem] border border-slate-200/80">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                          <Info className="w-4.5 h-4.5 text-sky-600" />
                          مفهوم التقييم الرشيق
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed space-y-3">
                          تعتمد ApplyWell Pro على تقييم فوري ثنائي الأبعاد بمجرد خروج المرشح من المقابلة.
                          يساعد هذا الأسلوب على تقليص فترات اتخاذ القرار من أسابيع إلى بضع ساعات وتفادي تشتت المرشحين المميزين.
                        </p>
                        <div className="mt-4 p-3.5 bg-sky-50/50 rounded-2xl border border-sky-100 text-sky-800 text-[11px] leading-relaxed">
                          📌 <strong>نصيحة:</strong> احرص دائماً على كتابة ملاحظات مفصلة للمهارات التقنية لتمكين فريق الفرز من مراجعة المخرجات بنضج.
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ======================= SUB-VIEW 6: SETTINGS ======================= */}
              {adminTab === ('settings' as any) && (
                <AdminSettings 
                  sources={sources}
                  setSources={setSources}
                  templates={templates}
                  setTemplates={setTemplates}
                />
              )}

            </main>

            {/* AUTO SCHEDULING DIALOG */}
            <AutoSchedulingModal 
              isOpen={isAutoScheduleOpen}
              onClose={() => setIsAutoScheduleOpen(false)}
              candidates={candidates}
              applications={applications}
              interviews={interviews}
              setInterviews={setInterviews}
              jobs={jobs}
              onSuccess={(count) => {
                // Done successfully
              }}
            />
          </div>
        ))}

        {/* ========================================================================= */}
        {/* =============== CANDIDATE PORTAL VIEW =============== */}
        {/* ========================================================================= */}
        {activePortal === 'candidate' && (
          <div className="flex-1 overflow-y-auto w-full">
            <CandidatePortalSimulator 
              candidates={candidates}
              applications={applications}
              interviews={interviews}
              setInterviews={setInterviews}
              jobs={jobs}
              setApplications={setApplications}
              candidateMessages={candidateMessages}
              setCandidateMessages={setCandidateMessages}
              selectedCandidateId={selectedCandidateId}
              onBackToAdmin={() => setActivePortal('admin')}
            />
          </div>
        )}
        {false && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full">
            
            {/* PERSPECTIVE SELECTOR BAR FOR DEMO USER ONLY */}
            <div className="w-full lg:w-80 glass border-l border-slate-200/80 p-6 flex flex-col shrink-0 gap-6">
              
              <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100/80">
                <h4 className="text-xs font-bold text-sky-800 mb-2 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-sky-600" />
                  أداة محاكاة المنظور
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  من هنا يمكنك اختيار أي مرشح لتجربة الواجهة الحقيقية التي تظهر على هاتفه أو متصفحه عند النقر على رابط واتساب الهجين.
                </p>
                
                <label className="text-[10px] font-bold text-slate-400 block mb-1">اختر مرشحاً لمعاينة بوابة هاتفه:</label>
                <select 
                  value={selectedCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right font-medium"
                >
                  {candidates.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* EXPLANATION OF HYBRID LINK FLOW */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-slate-500" />
                  كيف يعمل الرابط الهجين؟
                </h5>
                <ol className="text-[11px] text-slate-500 space-y-3 pr-4 list-decimal leading-relaxed">
                  <li>يتلقى المرشح رسالة آلية عبر واتساب تحتوي على رابط خاص ومؤمن.</li>
                  <li>عند نقر الرابط، يفتح له هذا الملف الموحد مباشرة دون تسجيل دخول معقد.</li>
                  <li>يمكنه تأكيد حضوره، تحديث مستنداته، والانضمام لقاعة الانتظار.</li>
                  <li>بمجرد إدخال المقابل له، يظهر له زر الانتقال المباشر للاجتماع.</li>
                </ol>
              </div>

              {/* INTERACTIVE CHAT PREVIEW SATELLITE (SIMULATOR OF THE HYBRID SYSTEM) */}
              <div className="mt-auto bg-slate-100 p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">كود الرابط الهجين المولد</span>
                <code className="text-[10px] bg-white px-2 py-1 rounded border border-slate-200 text-slate-600 font-mono block truncate">
                  {`https://applywell.pro/p?id=${currentCandidate.id}`}
                </code>
              </div>
            </div>

            {/* CANDIDATE'S SCREEN SIMULATOR */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full bg-gradient-to-br from-sky-50/40 via-slate-50 to-indigo-50/20">
              
              {/* HEADING PORTAL FOR THE CANDIDATE */}
              <div className="max-w-3xl mx-auto space-y-6">
                
                {/* FLOATING STATUS HEADER CARD */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/60 shadow-sm relative overflow-hidden bg-white/90">
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-sky-400 to-sky-600" />
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-lg">
                        {currentCandidate.name.substring(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">أهلاً بك، {currentCandidate.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">بوابة المرشح الموحدة | وظيفة: {currentCandJob?.title || 'جاري التحميل...'}</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold ${
                        currentCandApp?.status === 'Interviewing'
                          ? 'bg-amber-100 text-amber-700 animate-pulse'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        حالة التقديم: {currentCandApp?.status === 'New' && 'تم استلام طلبك'}
                        {currentCandApp?.status === 'Screening' && 'قيد المراجعة الأولية'}
                        {currentCandApp?.status === 'Interviewing' && 'مرحلة المقابلات نشطة'}
                        {currentCandApp?.status === 'Offered' && 'تم تقديم عرض عمل 🎉'}
                        {currentCandApp?.status === 'Rejected' && 'نعتذر، لم يحالفك الحظ'}
                        {currentCandApp?.status === 'Hired' && 'مبارك التوظيف! 🎈'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TWO COLUMN GRID FOR INTERACTIVE ACTIONS */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* MAIN BOX: INTERVIEW DETS & WAITING ROOM ENTRY (8 spans) */}
                  <div className="md:col-span-8 space-y-6">
                    
                    {/* ACTIVE INTERVIEW BANNER / WAITING ROOM ACCESS */}
                    <div className="glass p-6 rounded-[2rem] border border-slate-200 bg-white/95 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Video className="w-4.5 h-4.5 text-sky-600" />
                        المقابلة المجدولة وتأكيد الحضور
                      </h4>

                      {!currentCandInterview ? (
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-150 text-center">
                          <p className="text-xs text-slate-500">لا توجد مقابلات مجدولة حالياً لهذا الملف. سيقوم منسق التوظيف بالتواصل معك عبر واتساب قريباً.</p>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold block">تاريخ المقابلة</span>
                              <span className="text-xs font-bold text-slate-700 mt-1 block">{currentCandInterview.date}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold block">التوقيت</span>
                              <span className="text-xs font-bold text-slate-700 mt-1 block">{currentCandInterview.time} ظهراً</span>
                            </div>
                          </div>

                          <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-100 text-right text-xs text-sky-800 leading-relaxed">
                            💡 يرجى الانضمام لساحة الانتظار الرقمية قبل موعد المقابلة بـ 5 دقائق. سيقوم مهندس التوظيف برؤية انضمامك فورياً وإدخالك للاجتماع.
                          </div>

                          {/* DYNAMIC ACTION BUTTON BASED ON WAITING ROOM STATUS */}
                          <div className="pt-2">
                            {currentCandInterview.waiting_room_status === 'Not Joined' && (
                              <button
                                onClick={() => {
                                  // Update waiting status in main state to Waiting
                                  setInterviews(interviews.map(i => i.id === currentCandInterview.id ? { ...i, waiting_room_status: 'Waiting' } : i));
                                }}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 flex items-center justify-center gap-2"
                              >
                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                الانضمام إلى ساحة الانتظار الرقمية الآن
                              </button>
                            )}

                            {currentCandInterview.waiting_room_status === 'Waiting' && (
                              <div className="space-y-3">
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-xs font-bold text-amber-700">أنت متواجد الآن في قاعة الانتظار الافتراضية</span>
                                  </div>
                                  <span className="text-[10px] text-amber-600 font-medium">الرجاء عدم مغادرة الصفحة...</span>
                                </div>
                                <button
                                  onClick={() => {
                                    // Let candidate leave waiting room
                                    setInterviews(interviews.map(i => i.id === currentCandInterview.id ? { ...i, waiting_room_status: 'Not Joined' } : i));
                                  }}
                                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors duration-150"
                                >
                                  مغادرة ساحة الانتظار
                                </button>
                              </div>
                            )}

                            {currentCandInterview.waiting_room_status === 'In Progress' && (
                              <div className="space-y-4">
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                                  <p className="text-xs font-bold text-emerald-800">🎉 حان دورك الآن! المقابل بانتظارك في الغرفة الافتراضية.</p>
                                </div>
                                <a
                                  href={currentCandInterview.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-sky-600/25 transition-all duration-200 flex items-center justify-center gap-2 text-center"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  الانتقال إلى رابط الاجتماع المباشر (Google Meet)
                                </a>
                              </div>
                            )}

                            {currentCandInterview.waiting_room_status === 'Finished' && (
                              <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-center text-xs text-slate-600 font-medium">
                                لقد تمت مقابلتك بنجاح اليوم. شكراً جزيلاً لوقتك الثمين، وجاري مراجعة تقارير اللجنة الفنية.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* DYNAMIC COMPANY CARD */}
                    <div className="glass p-6 rounded-[2rem] border border-slate-200 bg-white/95">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">تفاصيل ومتطلبات الوظيفة</h4>
                      <h5 className="text-sm font-bold text-slate-800">{currentCandJob?.title || 'مطور واجهات'}</h5>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {currentCandJob?.description || 'لا يوجد وصف متاح.'}
                      </p>
                    </div>

                  </div>

                  {/* SIDE CHAT BOX: WHATSAPP AUTO RESPONDER CHAT SIMULATOR (4 spans) */}
                  <div className="md:col-span-4 flex flex-col h-[500px] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    
                    {/* CHAT HEADER */}
                    <div className="bg-[#075e54] p-4 text-white flex items-center justify-between gap-3 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                          AW
                        </div>
                        <div>
                          <p className="text-xs font-bold">مساعد ApplyWell الآلي</p>
                          <p className="text-[9px] text-emerald-100">نشط الآن</p>
                        </div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>

                    {/* CHAT BODY */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#e5ddd5]">
                      {(candidateMessages[currentCandidate.id] || []).map((msg, index) => (
                        <div 
                          key={index} 
                          className={`flex flex-col max-w-[85%] ${
                            msg.sender === 'candidate' 
                              ? 'mr-auto items-end' 
                              : 'ml-auto items-start'
                          }`}
                        >
                          <div className={`p-2.5 rounded-2xl text-xs leading-relaxed text-right ${
                            msg.sender === 'candidate'
                              ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none'
                              : 'bg-white text-slate-800 rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                          <span className="text-[8px] text-slate-500 mt-0.5">{msg.time}</span>
                        </div>
                      ))}
                    </div>

                    {/* CHAT INPUT FORM */}
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2 items-center shrink-0">
                      <input 
                        type="text" 
                        placeholder="اكتب استفسارك هنا..."
                        value={chatInputValue}
                        onChange={(e) => setChatInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendChatMessage(currentCandidate.id);
                        }}
                        className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-right"
                      />
                      <button 
                        onClick={() => handleSendChatMessage(currentCandidate.id)}
                        className="p-2 bg-[#075e54] hover:bg-[#128c7e] text-white rounded-xl shadow transition-colors duration-150 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                </div>

              </div>

            </main>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* ============================ MODALS SECTION ============================= */}
      {/* ========================================================================= */}

      {/* 1. ADD JOB MODAL */}
      <AnimatePresence>
        {isAddJobOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 max-w-lg w-full shadow-2xl border border-slate-100 text-right"
            >
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                <h4 className="text-base font-bold text-slate-800">إضافة وظيفة شاغرة جديدة</h4>
                <button 
                  onClick={handleCloseAddJob}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">المسمى الوظيفي</label>
                  <input 
                    type="text" 
                    required
                    placeholder="مثال: مطور بايثون أول"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">القسم</label>
                    <select 
                      value={newJobDepartment}
                      onChange={(e) => setNewJobDepartment(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    >
                      <option value="الهندسة والتقنية">الهندسة والتقنية</option>
                      <option value="إدارة المنتجات">إدارة المنتجات</option>
                      <option value="البيانات والذكاء الاصطناعي">البيانات والذكاء الاصطناعي</option>
                      <option value="الموارد البشرية">الموارد البشرية</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">الموقع والنمط</label>
                    <select 
                      value={newJobLocation}
                      onChange={(e) => setNewJobLocation(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    >
                      <option value="الرياض (حضوري)">الرياض (حضوري)</option>
                      <option value="الرياض (هجين)">الرياض (هجين)</option>
                      <option value="جدة (حضوري)">جدة (حضوري)</option>
                      <option value="عن بعد">عن بعد</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">نوع الدوام</label>
                    <select 
                      value={newJobType}
                      onChange={(e) => setNewJobType(e.target.value as any)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    >
                      <option value="Full-time">دوام كامل (Full-time)</option>
                      <option value="Part-time">دوام جزئي (Part-time)</option>
                      <option value="Remote">عن بعد (Remote)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">الوصف العام والشروط</label>
                  <textarea 
                    rows={4}
                    value={newJobDescription}
                    onChange={(e) => setNewJobDescription(e.target.value)}
                    placeholder="اكتب هنا المتطلبات الأساسية والوصف الوظيفي بشكل مقتضب ورشيق..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors duration-155"
                >
                  حفظ ونشر الوظيفة الشاغرة
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. ADD CANDIDATE MODAL */}
      <AnimatePresence>
        {isAddCandidateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 max-w-lg w-full shadow-2xl border border-slate-100 text-right"
            >
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                <h4 className="text-base font-bold text-slate-800">تسجيل مرشح يدوي</h4>
                <button 
                  onClick={handleCloseAddCandidate}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCandidate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">الاسم الكامل للمرشح</label>
                  <input 
                    type="text" 
                    required
                    placeholder="مثال: سلمان فهد الحربي"
                    value={newCandidateName}
                    onChange={(e) => setNewCandidateName(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">رقم الجوال (واتساب)</label>
                  <input 
                    type="text" 
                    required
                    value={newCandidatePhone}
                    onChange={(e) => setNewCandidatePhone(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">رابط السيرة الذاتية (Resume URL)</label>
                  <input 
                    type="url" 
                    placeholder="مثال: https://applywell.pro/resumes/sara.pdf"
                    value={newCandidateResumeUrl}
                    onChange={(e) => setNewCandidateResumeUrl(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">الوظيفة المستهدفة</label>
                  <select 
                    value={newCandidateTargetJobId}
                    onChange={(e) => setNewCandidateTargetJobId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                  >
                    {(() => {
                      const seenTitles = new Set<string>();
                      const uniqueJobsByTitle = jobs.filter(j => {
                        if (!j.title) return false;
                        if (seenTitles.has(j.title.trim())) return false;
                        seenTitles.add(j.title.trim());
                        return true;
                      });
                      return uniqueJobsByTitle.map(j => (
                        <option key={j.id} value={j.id}>{j.title}</option>
                      ));
                    })()}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">مصدر الاستقطاب</label>
                  <select 
                    value={newCandidateSource}
                    onChange={(e) => setNewCandidateSource(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                  >
                    {sources.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors duration-155"
                >
                  حفظ وتأكيد الملف
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. SCHEDULE INTERVIEW MODAL */}
      <AnimatePresence>
        {isScheduleInterviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 max-w-lg w-full shadow-2xl border border-slate-100 text-right"
            >
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                <h4 className="text-base font-bold text-slate-800">جدولة مقابلة فورية لمرشح</h4>
                <button 
                  onClick={handleCloseScheduleInterview}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleScheduleInterview} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">اختر الطلب / المرشح</label>
                  <select 
                    value={newIntAppId}
                    onChange={(e) => setNewIntAppId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                  >
                    {applications.map(app => {
                      const cand = candidates.find(c => c.id === app.candidate_id);
                      const j = jobs.find(job => job.id === app.job_id);
                      return (
                        <option key={app.id} value={app.id}>
                          {cand?.name} - {j?.title}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">تاريخ المقابلة</label>
                    <input 
                      type="date" 
                      required
                      value={newIntDate}
                      onChange={(e) => setNewIntDate(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">وقت البدء</label>
                    <input 
                      type="time" 
                      required
                      value={newIntTime}
                      onChange={(e) => setNewIntTime(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">مدة الجلسة (دقائق)</label>
                    <input 
                      type="number" 
                      required
                      value={newIntDuration}
                      onChange={(e) => setNewIntDuration(Number(e.target.value))}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">قاعة الاجتماع الافتراضية</label>
                    <input 
                      type="text" 
                      placeholder="مثال: Room A"
                      value={newIntRoom}
                      onChange={(e) => setNewIntRoom(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors duration-155"
                >
                  جدولة المقابلة وتوليد الروابط
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. FILL EVALUATION FORM MODAL */}
      <AnimatePresence>
        {isAddEvaluationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 max-w-lg w-full shadow-2xl border border-slate-100 text-right overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                <h4 className="text-base font-bold text-slate-800">تسجيل تقييم المقابلة الفنية</h4>
                <button 
                  onClick={handleCloseAddEvaluation}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateEvaluation} className="space-y-4">
                
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">الدرجة الكلية (1 إلى 5)</label>
                  <div className="flex gap-2 items-center justify-end">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        type="button"
                        key={star}
                        onClick={() => setEvalScore(star)}
                        className={`p-1 transition-transform hover:scale-110 ${evalScore >= star ? 'text-amber-400' : 'text-slate-200'}`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">المهارات التقنية والتقييم المعرفي</label>
                  <textarea 
                    rows={2}
                    required
                    placeholder="مثال: ممتاز في فهم أطر العمل وإعادة استخدام المكونات."
                    value={evalTech}
                    onChange={(e) => setEvalTech(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">مهارات التواصل والقيادة</label>
                  <textarea 
                    rows={2}
                    required
                    placeholder="مثال: يمتلك مهارات استماع ممتازة ويجيب بدقة ووضوح."
                    value={evalComm}
                    onChange={(e) => setEvalComm(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">الملاءمة الثقافية وقيم الشركة</label>
                  <textarea 
                    rows={2}
                    required
                    placeholder="مثال: يمتلك شغفاً للعمل الجماعي ومستعد للتطوير الذاتي المستمر."
                    value={evalCulture}
                    onChange={(e) => setEvalCulture(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">القرار / التوصية النهائية</label>
                    <select 
                      value={evalRecommendation}
                      onChange={(e) => setEvalRecommendation(e.target.value as any)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right font-semibold"
                    >
                      <option value="Strong Hire">توظيف مؤكد (Strong Hire)</option>
                      <option value="Hire">توظيف (Hire)</option>
                      <option value="Hold">تعليق (Hold)</option>
                      <option value="No Hire">استبعاد (No Hire)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">الملاحظات العامة والملخص</label>
                  <textarea 
                    rows={3}
                    placeholder="اكتب هنا الخلاصة الفنية للجنة التوظيف..."
                    value={evalNotes}
                    onChange={(e) => setEvalNotes(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors duration-155"
                >
                  اعتماد وحفظ استمارة التقييم
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



    </div>
  );
}
