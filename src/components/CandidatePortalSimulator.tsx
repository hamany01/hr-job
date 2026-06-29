import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Clock, Video, CheckCircle2, MessageSquare, Send, 
  Sparkles, Star, RefreshCw, Eye, Check, X, AlertCircle, Phone, Mail, 
  MapPin, HelpCircle, ChevronLeft, Calendar, BellRing, ArrowLeft, Camera
} from 'lucide-react';
import { Candidate, Application, Interview, Job } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface CandidatePortalSimulatorProps {
  candidates: Candidate[];
  applications: Application[];
  interviews: Interview[];
  setInterviews: React.Dispatch<React.SetStateAction<Interview[]>>;
  jobs: Job[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  candidateMessages: { [candidateId: string]: { sender: 'candidate' | 'bot'; text: string; time: string }[] };
  setCandidateMessages: React.Dispatch<React.SetStateAction<{ [candidateId: string]: { sender: 'candidate' | 'bot'; text: string; time: string }[] }>>;
}

export default function CandidatePortalSimulator({
  candidates,
  applications,
  interviews,
  setInterviews,
  jobs,
  setApplications,
  candidateMessages,
  setCandidateMessages
}: CandidatePortalSimulatorProps) {
  
  // Choose which candidate to simulate
  const [selectedCandId, setSelectedCandId] = useState<string>(candidates[0]?.id || 'c1');
  
  // Custom manual state selector to help عبدالرحمن test the 3 states
  const [simState, setSimState] = useState<'state1' | 'state2' | 'state3'>('state1');
  
  // Local state for interactive button feedback inside the phone
  const [attendanceConfirmed, setAttendanceConfirmed] = useState<boolean>(false);
  const [attendanceDeclined, setAttendanceDeclined] = useState<boolean>(false);
  const [localWaitingStatus, setLocalWaitingStatus] = useState<'Not Joined' | 'Waiting' | 'In Progress' | 'Finished'>('Not Joined');
  
  // Live Chat input inside candidate's phone
  const [chatInput, setChatInput] = useState('');

  const candidate = candidates.find(c => c.id === selectedCandId) || candidates[0];
  const app = applications.find(a => a.candidate_id === candidate?.id);
  const job = app ? jobs.find(j => j.id === app.job_id) : null;
  const interview = interviews.find(i => i.application_id === app?.id);

  // Sync state when selected candidate changes
  useEffect(() => {
    if (interview) {
      setLocalWaitingStatus(interview.waiting_room_status);
      
      // Map database state to simulated state for a seamless feel
      if (interview.waiting_room_status === 'Waiting' || interview.waiting_room_status === 'In Progress') {
        setSimState('state3');
      } else if (attendanceConfirmed) {
        setSimState('state2');
      } else {
        setSimState('state1');
      }
    } else {
      setSimState('state1');
      setLocalWaitingStatus('Not Joined');
    }
  }, [selectedCandId, interview]);

  // Handle confirmations
  const handleConfirmAttendance = () => {
    setAttendanceConfirmed(true);
    setAttendanceDeclined(false);
    // Move to state 2 automatically to show progression
    setSimState('state2');
    
    // Update Application Notes/Status locally
    if (app) {
      if (isSupabaseConfigured()) {
        const updatedNotes = (app.notes || '') + '\n[تأكيد حضور المقابلة بواسطة المرشح]';
        supabase.from('applications').update({ notes: updatedNotes }).eq('id', app.id).then(({ error }) => {
          if (error) console.error('Failed to sync confirm attendance to Supabase:', error);
        });
      }
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, notes: (a.notes || '') + '\n[تأكيد حضور المقابلة بواسطة المرشح]' } : a));
    }
  };

  const handleDeclineAttendance = () => {
    setAttendanceDeclined(true);
    setAttendanceConfirmed(false);
    
    if (app) {
      if (isSupabaseConfigured()) {
        const updatedNotes = (app.notes || '') + '\n[الاعتذار وطلب إعادة جدولة بواسطة المرشح]';
        supabase.from('applications').update({ notes: updatedNotes }).eq('id', app.id).then(({ error }) => {
          if (error) console.error('Failed to sync decline attendance to Supabase:', error);
        });
      }
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, notes: (a.notes || '') + '\n[الاعتذار وطلب إعادة جدولة بواسطة المرشح]' } : a));
    }
  };

  // Check-in (State 2 -> State 3)
  const handleCheckIn = () => {
    setLocalWaitingStatus('Waiting');
    setSimState('state3');
    
    // Update overall interviews state so Admin dashboard reacts live!
    if (interview) {
      if (isSupabaseConfigured()) {
        supabase.from('interviews').update({ waiting_room_status: 'Waiting' }).eq('id', interview.id).then(({ error }) => {
          if (error) console.error('Failed to sync waiting status check-in to Supabase:', error);
        });
      }
      setInterviews(prev => prev.map(i => i.id === interview.id ? { ...i, waiting_room_status: 'Waiting' } : i));
    }
  };

  // Send WhatsApp message in simulated candidate chat
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const timeNow = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    
    const updatedMessages = [
      ...(candidateMessages[selectedCandId] || []),
      { sender: 'candidate', text: chatInput, time: timeNow }
    ];

    setCandidateMessages(prev => ({
      ...prev,
      [selectedCandId]: updatedMessages
    }));

    const textSent = chatInput;
    setChatInput('');

    // Chatbot response
    setTimeout(() => {
      let response = 'مرحباً بك! تم تسجيل استفسارك بنجاح وسيتواصل معك منسق المقابلات قريباً.';
      if (textSent.includes('موعد') || textSent.includes('تغيير')) {
        response = 'إذا كنت ترغب بتغيير موعد المقابلة، يرجى كتابة التاريخ والوقت الجديد وسيقوم فريق الموارد البشرية بالتحقق من الجدول وتحديثه.';
      } else if (textSent.includes('رابط') || textSent.includes('كيف')) {
        response = 'بمجرد أن يبدأ المقابل الجلسة، سيظهر لك زر أخضر كبير "الانضمام للمقابلة الحية (Google Meet)" مباشرة على الشاشة.';
      } else if (textSent.includes('انتظار') || textSent.includes('دور')) {
        response = 'أنت حالياً في ساحة الانتظار الافتراضية. بمجرد انتهاء المرشح الذي أمامك، ستتلقى نغمة وتنبيه مباشر للدخول.';
      }

      setCandidateMessages(prev => ({
        ...prev,
        [selectedCandId]: [
          ...(prev[selectedCandId] || []),
          { sender: 'bot', text: response, time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }
        ]
      }));
    }, 1000);
  };

  // Resolve application status in Arabic
  const resolveApplicationStatus = (candId: string) => {
    const candidateApp = applications.find(a => a.candidate_id === candId);
    if (!candidateApp) return 'لا يوجد طلب نشط';
    const statusMap: { [key: string]: string } = {
      'New': 'جديد',
      'Screening': 'فحص السيرة الذاتية',
      'Interviewing': 'مقابلات',
      'Offered': 'مقبول مبدئياً',
      'Rejected': 'مرفوض',
      'Hired': 'تم التعيين'
    };
    return statusMap[candidateApp.status] || candidateApp.status;
  };

  // Queue position calculation
  const getQueuePosition = () => {
    const waitingInts = interviews.filter(i => i.waiting_room_status === 'Waiting');
    const index = waitingInts.findIndex(i => i.application_id === app?.id);
    if (index !== -1) return index + 1;
    return localWaitingStatus === 'In Progress' ? 0 : waitingInts.length + 1;
  };

  const getWaitTime = () => {
    const pos = getQueuePosition();
    if (pos === 0) return '0 دقيقة (حان دورك)';
    return `${pos * 15} دقيقة`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT COLUMN: CONTROL DECK (4 spans) */}
      <div className="lg:col-span-5 space-y-6">
        
        <div className="glass p-6 rounded-3xl border border-slate-200/80">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-sky-600 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-800">وحدة محاكاة تجربة المرشح</h3>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-6">
            قمنا ببناء هذا المحاكي لتمكينك من تتبع رحلة الكفاءات والتحقق من كيفية ظهور الحالات الثلاث المختلفة على بوابة الجوال الخاصة بهم بدقة بالغة.
          </p>

          {/* CANDIDATE SELECTOR */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-bold text-slate-700 block">اختر المرشح للمحاكاة:</label>
            <div className="grid grid-cols-2 gap-2">
              {candidates.slice(0, 4).map(cand => (
                <button
                  key={cand.id}
                  onClick={() => setSelectedCandId(cand.id)}
                  className={`p-2.5 rounded-xl border text-[11px] font-bold text-right transition-all flex flex-col justify-between ${
                    selectedCandId === cand.id 
                      ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{cand.name}</span>
                  <span className="text-[9px] text-slate-400 font-medium">{resolveApplicationStatus(cand.id)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SIMULATION STATE TOGGLERS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">الحالات الثلاث للتجربة (Test States):</label>
            <div className="space-y-2">
              
              <button
                onClick={() => {
                  setSimState('state1');
                  setAttendanceConfirmed(false);
                  setAttendanceDeclined(false);
                  setLocalWaitingStatus('Not Joined');
                  if (interview) {
                    if (isSupabaseConfigured()) {
                      supabase.from('interviews').update({ waiting_room_status: 'Not Joined' }).eq('id', interview.id).then(({ error }) => {
                        if (error) console.error(error);
                      });
                    }
                    setInterviews(prev => prev.map(i => i.id === interview.id ? { ...i, waiting_room_status: 'Not Joined' } : i));
                  }
                }}
                className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between ${
                  simState === 'state1'
                    ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/10'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-right">
                  <p className="text-xs font-bold">الحالة 1: الدخول الأول (Invitation)</p>
                  <p className="text-[9px] opacity-80">ترحيب، عرض بطاقة الوظيفة، قبول أو اعتذار عن الموعد</p>
                </div>
                <Eye className="w-4 h-4 shrink-0" />
              </button>

              <button
                onClick={() => {
                  setSimState('state2');
                  setAttendanceConfirmed(true);
                  setLocalWaitingStatus('Not Joined');
                  if (interview) {
                    if (isSupabaseConfigured()) {
                      supabase.from('interviews').update({ waiting_room_status: 'Not Joined' }).eq('id', interview.id).then(({ error }) => {
                        if (error) console.error(error);
                      });
                    }
                    setInterviews(prev => prev.map(i => i.id === interview.id ? { ...i, waiting_room_status: 'Not Joined' } : i));
                  }
                }}
                className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between ${
                  simState === 'state2'
                    ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/10'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-right">
                  <p className="text-xs font-bold">الحالة 2: يوم المقابلة (Interview Day Check-in)</p>
                  <p className="text-[9px] opacity-80">يظهر زر Check-in الكبير للانضمام الافتراضي</p>
                </div>
                <Eye className="w-4 h-4 shrink-0" />
              </button>

              <button
                onClick={() => {
                  setSimState('state3');
                  setLocalWaitingStatus('Waiting');
                  if (interview) {
                    if (isSupabaseConfigured()) {
                      supabase.from('interviews').update({ waiting_room_status: 'Waiting' }).eq('id', interview.id).then(({ error }) => {
                        if (error) console.error(error);
                      });
                    }
                    setInterviews(prev => prev.map(i => i.id === interview.id ? { ...i, waiting_room_status: 'Waiting' } : i));
                  }
                }}
                className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between ${
                  simState === 'state3' && localWaitingStatus !== 'In Progress'
                    ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/10'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-right">
                  <p className="text-xs font-bold">الحالة 3: داخل ساحة الانتظار (Live Queue)</p>
                  <p className="text-[9px] opacity-80">متابعة دقيقة لترتيب الدور والوقت المتبقي</p>
                </div>
                <Eye className="w-4 h-4 shrink-0" />
              </button>

            </div>
          </div>

          {/* ADMIN ACTION SHORTCUTS (CALL TO ROOM LIVE SIMULATION) */}
          {simState === 'state3' && (
            <div className="mt-6 p-4 bg-amber-50/60 rounded-2xl border border-amber-100 space-y-3">
              <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
                محاكاة من جانب المقابل (عبدالرحمن):
              </p>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                هل تريد محاكاة استدعاء المرشح {candidate?.name} الآن للمقابلة الحية ليتحول جواله تلقائياً لشاشة الحضور الفوري؟
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLocalWaitingStatus('In Progress');
                    if (interview) {
                      if (isSupabaseConfigured()) {
                        supabase.from('interviews').update({ waiting_room_status: 'In Progress' }).eq('id', interview.id).then(({ error }) => {
                          if (error) console.error(error);
                        });
                      }
                      setInterviews(prev => prev.map(i => i.id === interview.id ? { ...i, waiting_room_status: 'In Progress' } : i));
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-md shadow-emerald-500/20"
                >
                  استدعاء المرشح الآن 🟢
                </button>
                <button
                  onClick={() => {
                    setLocalWaitingStatus('Waiting');
                    if (interview) {
                      if (isSupabaseConfigured()) {
                        supabase.from('interviews').update({ waiting_room_status: 'Waiting' }).eq('id', interview.id).then(({ error }) => {
                          if (error) console.error(error);
                        });
                      }
                      setInterviews(prev => prev.map(i => i.id === interview.id ? { ...i, waiting_room_status: 'Waiting' } : i));
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg"
                >
                  إعادة للانتظار
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* RIGHT COLUMN: MODERN SMARTPHONE MOCKUP FRAME (7 spans) */}
      <div className="lg:col-span-7 flex justify-center">
        
        <div className="relative w-[340px] h-[680px] bg-slate-900 rounded-[3rem] p-3.5 shadow-2xl border-4 border-slate-800/80 ring-12 ring-slate-900/10 flex flex-col overflow-hidden">
          
          {/* PHONE SPEAKER & FRONT CAMERA NOTCH */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-900 rounded-full z-50 flex items-center justify-between px-6">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <span className="w-12 h-1 bg-slate-800 rounded-full" />
            <span className="w-2.5 h-2.5 rounded-full bg-blue-900/60 border border-slate-800" />
          </div>

          {/* INTERNAL PHONE SCREEN CONTAINER */}
          <div className="flex-1 bg-gradient-to-b from-sky-50 to-slate-50 rounded-[2.2rem] overflow-hidden flex flex-col relative text-slate-800">
            
            {/* PHONE STATUS BAR */}
            <div className="h-10 px-6 pt-3 flex items-center justify-between text-[11px] font-bold text-slate-600 z-40 select-none">
              <span>03:25 م</span>
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <div className="w-5.5 h-3 border border-slate-600 rounded-sm p-0.5 flex items-center">
                  <div className="h-full bg-slate-600 w-4/5 rounded-2xs" />
                </div>
              </div>
            </div>

            {/* CANDIDATE PORTAL CONTENT INSIDE THE PHONE */}
            <div className="flex-1 flex flex-col overflow-y-auto px-4 pb-6 scrollbar-none">
              
              {/* BRAND HEADER */}
              <div className="flex items-center justify-between py-3 border-b border-slate-200/50 mb-4 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-sky-600 flex items-center justify-center text-white text-[10px] font-bold">A</div>
                  <span className="text-xs font-bold text-sky-800">ApplyWell Portal</span>
                </div>
                <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-1.5 py-0.5 rounded-full font-bold">بوابة المرشح الآمنة</span>
              </div>

              {/* SIMULATION STATE 1: FIRST ENTRY / INVITATION */}
              {simState === 'state1' && (
                <div className="flex-1 flex flex-col gap-4 animate-fade-in">
                  
                  {/* Greeting glass card */}
                  <div className="glass p-4 rounded-2xl border border-slate-200/60 shadow-sm text-right">
                    <h4 className="text-sm font-extrabold text-slate-800">أهلاً بك، {candidate?.name} 👋</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      يسعدنا اهتمامك بالانضمام لعائلة <span className="text-sky-700 font-bold">ApplyWell Pro</span>. تم ترشيحك لمرحلة المقابلات الفنية.
                    </p>
                  </div>

                  {/* Job Details Box */}
                  <div className="p-4 bg-sky-500 text-white rounded-2xl shadow-md space-y-2.5 text-right relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                    <span className="text-[8px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full">تفاصيل الفرصة</span>
                    <div>
                      <h5 className="text-xs font-bold">{job?.title || 'مطور واجهات مستخدم'}</h5>
                      <p className="text-[9px] text-sky-100 mt-1">{job?.department} | {job?.location}</p>
                    </div>
                  </div>

                  {/* Scheduled Slot Details */}
                  <div className="glass p-4 rounded-2xl border border-slate-200/60 text-right space-y-3">
                    <span className="text-[9px] text-slate-400 block font-bold">الموعد المقترح للمقابلة:</span>
                    <div className="flex items-center gap-3 bg-white/80 p-2.5 rounded-xl border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex flex-col items-center justify-center font-bold">
                        <span className="text-[8px]">اليوم</span>
                        <span className="text-xs">29</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">اليوم، الاثنين 29 يونيو 2026</p>
                        <p className="text-[10px] text-slate-500">الوقت: {interview?.time || '10:00'} م (مدة {interview?.duration || '25'} دقيقة)</p>
                      </div>
                    </div>

                    {/* CONFIRMATION BUTTONS */}
                    <div className="pt-2 space-y-2">
                      {attendanceConfirmed ? (
                        <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>تم تأكيد الحضور بنجاح! شكراً لك.</span>
                        </div>
                      ) : attendanceDeclined ? (
                        <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 text-xs font-bold flex items-center justify-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>تم إرسال طلب الاعتذار وتغيير الموعد.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleConfirmAttendance}
                            className="py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold rounded-xl transition-all"
                          >
                            تأكيد الحضور ✅
                          </button>
                          <button
                            onClick={handleDeclineAttendance}
                            className="py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-xl transition-all"
                          >
                            طلب موعد آخر
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* SIMULATION STATE 2: INTERVIEW DAY / CHECK-IN */}
              {simState === 'state2' && (
                <div className="flex-1 flex flex-col gap-4 justify-between animate-fade-in">
                  
                  <div className="space-y-4">
                    {/* Pulsing Alert */}
                    <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-2xl text-right">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>تبدأ مقابلتك قريباً اليوم!</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        يرجى تسجيل الدخول إلى ساحة الانتظار الرقمية لإعلام لجنة التوظيف بوجودك وجهوزيتك للبدء.
                      </p>
                    </div>

                    {/* Interview specs */}
                    <div className="glass p-4 rounded-2xl border border-slate-200/50 text-right space-y-2">
                      <p className="text-[10px] text-slate-400 font-bold">اللجنة المقابلة:</p>
                      <p className="text-xs font-bold text-slate-800">عبدالرحمن العتيبي (كبير مهندسي البرمجيات)</p>
                      <p className="text-[9px] text-slate-500">طبيعة الجلسة: مقابلة فنية وهندسية شاملة</p>
                    </div>
                  </div>

                  {/* Pulsing BIG Check-in button */}
                  <div className="flex flex-col items-center justify-center py-6 space-y-3">
                    <button
                      onClick={handleCheckIn}
                      className="w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex flex-col items-center justify-center font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all animate-pulse"
                    >
                      <Smartphone className="w-7 h-7 mb-1" />
                      <span className="text-[10px]">دخول الساحة</span>
                      <span className="text-[8px] font-normal opacity-80">(Check-in)</span>
                    </button>
                    <p className="text-[9px] text-slate-400 text-center font-medium">اضغط لتأكيد الحضور والانتظار في القاعة الرقمية</p>
                  </div>

                </div>
              )}

              {/* SIMULATION STATE 3: LIVE QUEUE / WAITING ROOM */}
              {simState === 'state3' && (
                <div className="flex-1 flex flex-col gap-4 animate-fade-in relative justify-between">
                  
                  {/* THE ACTUAL INTERACTIVE "CALL TO GOOGLE MEET" OVERLAY WHEN IN_PROGRESS */}
                  {localWaitingStatus === 'In Progress' ? (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl p-5 z-50 flex flex-col items-center justify-center text-center text-white space-y-5 animate-fade-in">
                      <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-white">حان دورك الآن! 🎉</h4>
                        <p className="text-[10px] text-slate-300">المهندس عبدالرحمن يدعوك للانضمام للمقابلة الحية.</p>
                      </div>
                      
                      <a 
                        href="https://meet.google.com/abc-defg-hij" 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        دخول المقابلة (Google Meet)
                      </a>
                      
                      <p className="text-[8px] text-slate-400">سيتم فتح منصة مكالمات الفيديو في نافذة جديدة.</p>
                    </div>
                  ) : null}

                  {/* LIVE QUEUE PROGRESS BAR */}
                  <div className="glass p-4 rounded-2xl border border-slate-200/60 text-right space-y-3.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">ساحة الانتظار الرقمية الحية</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-b border-slate-100 py-2.5">
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400">الترتيب في الطابور:</p>
                        <p className="text-xs font-bold text-sky-800">يوجد {getQueuePosition()} مرشحين أمامك</p>
                      </div>
                      <div className="text-right border-r border-slate-100 pr-2">
                        <p className="text-[9px] text-slate-400">الوقت التقريبي للانتظار:</p>
                        <p className="text-xs font-bold text-amber-600">{getWaitTime()}</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-sky-50/60 rounded-xl border border-sky-100 text-[10px] text-sky-800 leading-relaxed font-semibold text-center">
                      ⏱️ يرجى عدم إغلاق هذه الصفحة لتلقي إشعار الدخول الفوري.
                    </div>
                  </div>

                  {/* INTEGRATED LIVE CHAT IN PHONE */}
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200/50 flex flex-col overflow-hidden min-h-[180px] max-h-[250px] shadow-sm">
                    <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-100 flex justify-between items-center shrink-0">
                      <span className="text-[9px] font-bold text-slate-600">الدعم الآلي للتوظيف الرشيق</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    </div>
                    
                    {/* CHAT MESSAGES PANEL */}
                    <div className="flex-1 p-2.5 overflow-y-auto space-y-2 text-right">
                      {(candidateMessages[selectedCandId] || []).map((msg, index) => (
                        <div 
                          key={index}
                          className={`flex flex-col max-w-[85%] rounded-xl p-2 text-[10px] leading-relaxed ${
                            msg.sender === 'candidate'
                              ? 'bg-sky-600 text-white mr-auto'
                              : 'bg-slate-100 text-slate-700 ml-auto'
                          }`}
                        >
                          <p>{msg.text}</p>
                          <span className={`text-[8px] text-left block mt-0.5 ${msg.sender === 'candidate' ? 'text-sky-100' : 'text-slate-400'}`}>
                            {msg.time}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* INPUT FORM FOR PHONE CHAT */}
                    <div className="p-1.5 border-t border-slate-100 flex gap-1.5 shrink-0">
                      <input 
                        type="text"
                        placeholder="اكتب رسالتك للمنسق..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                        className="flex-1 px-3 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 text-right"
                      />
                      <button
                        onClick={handleSendChat}
                        className="p-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* VIRTUAL HOME BUTTON MOCKUP */}
            <div className="h-6 flex items-center justify-center shrink-0 z-40 select-none">
              <div className="w-24 h-1 bg-slate-400 rounded-full mb-1" />
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
