import React, { useState } from 'react';
import { 
  Settings, MessageSquare, Plus, Trash, Save, HelpCircle, 
  Sparkles, CheckCircle2, ChevronRight, Smartphone, ShieldCheck
} from 'lucide-react';

interface AdminSettingsProps {
  sources: string[];
  setSources: React.Dispatch<React.SetStateAction<string[]>>;
  templates: {
    invite: string;
    reschedule: string;
    offer: string;
    reject: string;
  };
  setTemplates: React.Dispatch<React.SetStateAction<{
    invite: string;
    reschedule: string;
    offer: string;
    reject: string;
  }>>;
}

export default function AdminSettings({
  sources,
  setSources,
  templates,
  setTemplates
}: AdminSettingsProps) {
  const [newSource, setNewSource] = useState('');
  const [localTemplates, setLocalTemplates] = useState(templates);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.trim()) return;
    if (sources.includes(newSource.trim())) return;
    setSources([...sources, newSource.trim()]);
    setNewSource('');
  };

  const handleRemoveSource = (sourceToRemove: string) => {
    setSources(sources.filter(s => s !== sourceToRemove));
  };

  const handleSaveTemplates = () => {
    setTemplates(localTemplates);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {showSuccessToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in text-xs font-bold border border-emerald-500">
          <CheckCircle2 className="w-5 h-5" />
          <span>تم حفظ الإعدادات وقوالب الرسائل بنجاح!</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* DROPDOWN OPTIONS MANAGER (SOURCES OF TALENT) */}
        <div className="glass p-6 rounded-3xl border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-5 h-5 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-800">إدارة مصادر الاستقطاب (Candidate Sources)</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">أضف أو احذف القنوات التي يتم توظيف المرشحين منها. ستنعكس هذه الخيارات ديناميكياً في قائمة إضافة مرشح جديد.</p>

            {/* Current sources list */}
            <div className="flex flex-wrap gap-2 mb-4">
              {sources.map((source, index) => (
                <span 
                  key={index}
                  className="bg-sky-50 text-sky-800 text-xs font-semibold px-3 py-1.5 rounded-xl border border-sky-100 flex items-center gap-1.5"
                >
                  {source}
                  <button 
                    onClick={() => handleRemoveSource(source)}
                    className="text-sky-600 hover:text-rose-600 transition-colors duration-150"
                    title="حذف المصدر"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddSource} className="flex gap-2">
            <input 
              type="text"
              placeholder="مثال: بيت.كوم، موقع الشركة..."
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right"
            />
            <button 
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/10 transition-colors"
            >
              إضافة
            </button>
          </form>
        </div>

        {/* SECURITY & AUTOMATION INFO */}
        <div className="glass p-6 rounded-3xl border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">حماية البيانات والأمان (RLS Policies)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              جميع العمليات والاتصالات عبر بوابة المرشح مشفرة بالكامل. يتم تمكين سياسات <span className="font-bold text-sky-700">Row-Level Security (RLS)</span> على جداول Supabase لضمان ألا يرى أي مرشح سوى بيانات المقابلة والوظيفة الخاصة به باستخدام الروابط الهجينة المخصصة.
            </p>
          </div>
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/60 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[10px] text-emerald-800 font-bold">نظام الحماية: مفعل ونشط لجميع الجداول الستة</span>
          </div>
        </div>

      </div>

      {/* WHATSAPP TEMPLATE BUILDER */}
      <div className="glass p-6 rounded-3xl border border-slate-200/80">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-800">تخصيص قوالب رسائل واتساب الهجينة</h3>
          </div>
          <button 
            onClick={handleSaveTemplates}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 flex items-center gap-1.5 transition-all duration-200"
          >
            <Save className="w-4 h-4" />
            حفظ جميع القوالب
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          قم بتعديل نصوص الرسائل التي يتم إرسالها آلياً للمرشحين عبر واتساب. يمكنك استخدام المتغيرات الافتراضية مثل <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-mono text-[10px]">{`{name}`}</code> و <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-mono text-[10px]">{`{job}`}</code> و <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-mono text-[10px]">{`{time}`}</code> و <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-mono text-[10px]">{`{link}`}</code> وسيتم تعويضها آلياً بنصوص حقيقية عند الإرسال.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Template 1: Invite */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">1. قالب رسالة الدعوة (Invitation Template)</label>
            <textarea 
              rows={4}
              value={localTemplates.invite}
              onChange={(e) => setLocalTemplates({...localTemplates, invite: e.target.value})}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right leading-relaxed font-sans"
            />
          </div>

          {/* Template 2: Reschedule */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">2. قالب تغيير موعد المقابلة (Reschedule Template)</label>
            <textarea 
              rows={4}
              value={localTemplates.reschedule}
              onChange={(e) => setLocalTemplates({...localTemplates, reschedule: e.target.value})}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right leading-relaxed font-sans"
            />
          </div>

          {/* Template 3: Offer/Accept */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">3. قالب العرض والقبول المبدئي (Offer / Pass Template)</label>
            <textarea 
              rows={4}
              value={localTemplates.offer}
              onChange={(e) => setLocalTemplates({...localTemplates, offer: e.target.value})}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right leading-relaxed font-sans"
            />
          </div>

          {/* Template 4: Reject */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">4. قالب الاعتذار والرفض (Rejection Template)</label>
            <textarea 
              rows={4}
              value={localTemplates.reject}
              onChange={(e) => setLocalTemplates({...localTemplates, reject: e.target.value})}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-right leading-relaxed font-sans"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
