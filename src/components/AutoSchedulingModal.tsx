import React, { useState } from 'react';
import { 
  Calendar, Clock, Zap, X, HelpCircle, Sparkles, Check, 
  AlertCircle, ChevronLeft, ChevronRight, Activity
} from 'lucide-react';
import { Candidate, Application, Interview, Job } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AutoSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  applications: Application[];
  interviews: Interview[];
  setInterviews: React.Dispatch<React.SetStateAction<Interview[]>>;
  jobs: Job[];
  onSuccess: (count: number) => void;
}

export default function AutoSchedulingModal({
  isOpen,
  onClose,
  candidates,
  applications,
  interviews,
  setInterviews,
  jobs,
  onSuccess
}: AutoSchedulingModalProps) {
  // Config States
  const [startDate, setStartDate] = useState('2026-06-29');
  const [endDate, setEndDate] = useState('2026-07-03');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('16:00');
  const [duration, setDuration] = useState(25);
  const [breakTime, setBreakTime] = useState(5);
  
  // Simulation results
  const [previewSlots, setPreviewSlots] = useState<{ candidateName: string; date: string; time: string; jobTitle: string }[]>([]);
  const [step, setStep] = useState<'config' | 'preview'>('config');

  if (!isOpen) return null;

  // Find candidates that do NOT have any scheduled interview
  const getUnscheduledCandidates = () => {
    return candidates.filter(cand => {
      const app = applications.find(a => a.candidate_id === cand.id);
      if (!app) return false;
      // Skip if already has scheduled or completed interview
      const hasInterview = interviews.some(i => i.application_id === app.id && i.status === 'Scheduled');
      return !hasInterview;
    });
  };

  const unscheduled = getUnscheduledCandidates();

  // Generate Slots
  const handleGeneratePreview = () => {
    if (unscheduled.length === 0) {
      alert('جميع المرشحين لديهم مقابلات مجدولة بالفعل!');
      return;
    }

    const slots: { candidateName: string; date: string; time: string; jobTitle: string; appId: string }[] = [];
    let currentCandidateIndex = 0;

    // Dates loop
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateArray: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Skip weekends (Friday/Saturday or just standard Friday for Saudi weekends)
      const dayOfWeek = d.getDay(); 
      if (dayOfWeek === 5) continue; // Skip Friday
      dateArray.push(d.toISOString().split('T')[0]);
    }

    if (dateArray.length === 0) {
      alert('الرجاء اختيار نطاق تواريخ يحتوي على أيام عمل صحيحة.');
      return;
    }

    // Timings
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const totalSlotMinutes = duration + breakTime;

    // Distribute unscheduled candidates to slots
    for (const dateStr of dateArray) {
      if (currentCandidateIndex >= unscheduled.length) break;

      let currentHour = startHour;
      let currentMin = startMin;

      while (currentCandidateIndex < unscheduled.length) {
        // Check if exceeds daily end time
        if (currentHour > endHour || (currentHour === endHour && currentMin + duration > endMin)) {
          break; // move to next day
        }

        // Format time
        const formattedHour = String(currentHour).padStart(2, '0');
        const formattedMin = String(currentMin).padStart(2, '0');
        const timeStr = `${formattedHour}:${formattedMin}`;

        const cand = unscheduled[currentCandidateIndex];
        const app = applications.find(a => a.candidate_id === cand.id);
        const job = app ? jobs.find(j => j.id === app.job_id) : null;

        slots.push({
          candidateName: cand.name,
          date: dateStr,
          time: timeStr,
          jobTitle: job?.title || 'مطور واجهات أول',
          appId: app?.id || ''
        });

        currentCandidateIndex++;

        // Add duration + break
        currentMin += totalSlotMinutes;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
      }
    }

    setPreviewSlots(slots);
    setStep('preview');
  };

  // Commit Scheduling to State
  const handleConfirmScheduling = async () => {
    const newInterviews: Interview[] = previewSlots.map((slot, index) => ({
      id: `i-auto-${Date.now()}-${index}`,
      application_id: slot.appId,
      date: slot.date,
      time: slot.time,
      duration: duration,
      status: 'Scheduled',
      type: 'Technical',
      room_number: `غرفة ${String.fromCharCode(65 + (index % 3))}`,
      meeting_link: `https://meet.google.com/meet-${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}`,
      whatsapp_link_sent: false,
      waiting_room_status: 'Not Joined'
    }));

    let finalInterviews = newInterviews;
    if (isSupabaseConfigured()) {
      const supabasePayload = newInterviews.map(({ id, ...rest }) => rest);
      const { data: insertedInts, error } = await supabase
        .from('interviews')
        .insert(supabasePayload)
        .select();

      if (error) {
        alert(`فشل حفظ المقابلات المجدولة في Supabase: ${error.message}`);
        return;
      }
      if (insertedInts && insertedInts.length > 0) {
        finalInterviews = insertedInts;
      }
    }

    setInterviews(prev => [...finalInterviews, ...prev]);
    onSuccess(newInterviews.length);
    onClose();
    // Reset
    setStep('config');
    setPreviewSlots([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <div className="glass w-full max-w-2xl rounded-[2.5rem] border border-white/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-200/60 flex items-center justify-between bg-sky-50/50">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-sky-600 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">محرك الجدولة الآلية للمرشحين (Auto-Scheduler)</h3>
              <p className="text-[10px] text-slate-500">توزيع ذكي للمرشحين الجدد لملء الفراغات والوظائف بمرونة تامة.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* CONTAINER CONTENT */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {step === 'config' ? (
            <div className="space-y-6">
              
              {/* ALERTS / STATS */}
              <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-sky-600" />
                <div className="text-right">
                  <p className="text-xs font-bold text-sky-900">المرشحون الجاهزون للجدولة: {unscheduled.length} مرشحاً</p>
                  <p className="text-[10px] text-sky-700">سيقوم المحرك بتوزيعهم تلقائياً على فترات مريحة وتجنب التداخل.</p>
                </div>
              </div>

              {/* INPUT FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">تاريخ البدء</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">تاريخ الانتهاء</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    <input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">بداية المقابلات اليومية</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    <input 
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">نهاية المقابلات اليومية</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    <input 
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">مدة المقابلة (دقيقة)</label>
                  <input 
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">مدة الراحة / الفاصل (دقيقة)</label>
                  <input 
                    type="number"
                    value={breakTime}
                    onChange={(e) => setBreakTime(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right font-semibold"
                  />
                </div>

              </div>

            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600" />
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-950">توزيع المقابلات جاهز للتأكيد</p>
                  <p className="text-[10px] text-emerald-800">تم توزيع عدد {previewSlots.length} مقابلة بنجاح دون أي تضارب.</p>
                </div>
              </div>

              {/* TIMELINE LIST */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">جدول التوزيع المؤقت</span>
                
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {previewSlots.map((slot, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-right">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{slot.candidateName}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">{slot.jobTitle}</p>
                      </div>
                      <div className="text-left font-mono">
                        <p className="text-xs font-bold text-sky-700">{slot.date}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">⏱️ {slot.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-200/60 bg-slate-50/80 flex items-center justify-between">
          {step === 'config' ? (
            <>
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button 
                type="button"
                onClick={handleGeneratePreview}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/10 flex items-center gap-2 transition-all"
              >
                <span>ابدأ التوزيع الآلي</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button 
                type="button"
                onClick={() => setStep('config')}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>العودة للتعديل</span>
              </button>
              <button 
                type="button"
                onClick={handleConfirmScheduling}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/10 transition-all"
              >
                تأكيد وحفظ المواعيد
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
