'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  Plus, 
  Mail, 
  TrendingUp, 
  Settings, 
  LogOut, 
  ArrowRight,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { 
  db, 
  Campaign, 
  OperationType, 
  handleFirestoreError 
} from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import { generateCampaignContent, generateCampaignImage } from '@/lib/gemini';
import ReactMarkdown from 'react-markdown';

// --- Sub-components ---

const StepIndicator = ({ step }: { step: number }) => (
  <div className="flex gap-2 mb-8">
    {[1, 2, 3].map((s) => (
      <div 
        key={s}
        className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-[#141414]' : 'bg-[#141414]/10'}`}
      />
    ))}
  </div>
);

export default function Home() {
  const { user, login, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generate' | 'campaigns'>('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generation state
  const [prompt, setPrompt] = useState('');
  const [generatedCampaign, setGeneratedCampaign] = useState<Partial<Campaign> | null>(null);
  const [step, setStep] = useState(1);

  const fetchCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'campaigns'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
      setCampaigns(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleGenerate = async () => {
    if (!prompt || !user) return;
    setIsGenerating(true);
    try {
      // Step 1: Content
      setStep(1);
      const content = await generateCampaignContent(prompt);
      
      // Step 2: Image
      setStep(2);
      const imageUrl = await generateCampaignImage(prompt);

      setGeneratedCampaign({
        name: prompt.slice(0, 30) + '...',
        prompt,
        subject: content.subject,
        body: content.body,
        imageUrl: imageUrl || undefined,
        status: 'draft',
        ownerId: user.uid,
        createdAt: Timestamp.now(),
        stats: { opens: 0, clicks: 0, sentCount: 0 }
      });
      setStep(3);
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCampaign = async () => {
    if (!generatedCampaign || !user) return;
    try {
      await addDoc(collection(db, 'campaigns'), generatedCampaign);
      await fetchCampaigns();
      setActiveTab('campaigns');
      setGeneratedCampaign(null);
      setPrompt('');
      setStep(1);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'campaigns');
    }
  };

  const simulateData = async () => {
    if (!user || campaigns.length === 0) return;
    setLoading(true);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      for (const campaign of campaigns) {
        const campaignRef = doc(db, 'campaigns', campaign.id!);
        await updateDoc(campaignRef, {
          stats: {
            opens: Math.floor(Math.random() * 1000) + 100,
            clicks: Math.floor(Math.random() * 400) + 50,
            sentCount: 2000
          },
          status: 'sent'
        });
      }
      await fetchCampaigns();
    } catch (error) {
      console.error("Simulation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-[#141414]" size={40} />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#E4E3E0]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-12 rounded-[32px] shadow-sm border border-[#141414]/5 text-center"
      >
        <div className="w-16 h-16 bg-[#141414] rounded-2xl flex items-center justify-center mx-auto mb-8">
          <Mail className="text-white" size={32} />
        </div>
        <h1 className="text-4xl font-sans font-medium tracking-tight mb-4">CampaignAI</h1>
        <p className="text-[#141414]/60 mb-8 font-sans">
          Professional email marketing generated in seconds.
        </p>
        <button 
          onClick={login}
          className="w-full py-4 bg-[#141414] text-white rounded-full font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 group"
        >
          Sign in with Google
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#141414]/10 p-6 flex flex-col fixed h-full bg-white z-10">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center">
            <Mail className="text-white" size={18} />
          </div>
          <span className="font-medium text-lg tracking-tight">CampaignAI</span>
        </div>

        <nav className="flex-1 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'dashboard' ? 'bg-[#141414] text-white' : 'hover:bg-[#141414]/5 text-[#141414]/60 hover:text-[#141414]'}`}
          >
            <TrendingUp size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'campaigns' ? 'bg-[#141414] text-white' : 'hover:bg-[#141414]/5 text-[#141414]/60 hover:text-[#141414]'}`}
          >
            <Mail size={20} />
            Campaigns
          </button>
          <button 
            onClick={() => setActiveTab('generate')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'generate' ? 'bg-[#141414] text-white' : 'hover:bg-[#141414]/5 text-[#141414]/60 hover:text-[#141414]'}`}
          >
            <Plus size={20} />
            Generate New
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-[#141414]/10 space-y-1">
          <div className="px-4 py-2 flex items-center gap-3 mb-4">
             <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
             <div className="overflow-hidden">
               <p className="text-sm font-medium truncate">{user.displayName}</p>
               <p className="text-xs text-[#141414]/40 truncate">{user.email}</p>
             </div>
          </div>
          <button 
            onClick={logout}
            className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-[#141414]/60 hover:text-[#141414] hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-medium tracking-tight">Performance Analytics</h1>
                <p className="text-[#141414]/60">Overview of your recent marketing efforts.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={simulateData}
                  disabled={campaigns.length === 0 || loading}
                  className="px-4 py-2 bg-white border border-[#141414]/10 rounded-full text-sm font-medium hover:bg-[#141414]/5 transition-colors disabled:opacity-50"
                >
                  Simulate Performance Data
                </button>
                <div className="px-4 py-2 bg-white border border-[#141414]/10 rounded-full text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live System
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[24px] border border-[#141414]/5 shadow-sm">
                <p className="text-sm text-[#141414]/40 font-medium mb-1 uppercase tracking-wider">Total Sent</p>
                <p className="text-4xl font-mono tracking-tighter">
                  {campaigns.reduce((acc, c) => acc + (c.stats?.sentCount || 0), 0)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-[#141414]/5 shadow-sm">
                <p className="text-sm text-[#141414]/40 font-medium mb-1 uppercase tracking-wider">Open Rate</p>
                <p className="text-4xl font-mono tracking-tighter text-blue-600">
                  {campaigns.length > 0 
                    ? ((campaigns.reduce((acc, c) => acc + (c.stats?.opens || 0), 0) / Math.max(1, campaigns.reduce((acc, c) => acc + (c.stats?.sentCount || 0), 0))) * 100).toFixed(1)
                    : "0"}%
                </p>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-[#141414]/5 shadow-sm">
                <p className="text-sm text-[#141414]/40 font-medium mb-1 uppercase tracking-wider">Total Clicks</p>
                <p className="text-4xl font-mono tracking-tighter text-green-600">
                  {campaigns.reduce((acc, c) => acc + (c.stats?.clicks || 0), 0)}
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-[#141414]/5 shadow-sm">
              <h2 className="text-xl font-medium mb-8">Campaign Performance Over Time</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={campaigns.slice().reverse().map(c => ({
                    name: c.name.slice(0, 10),
                    opens: c.stats?.opens || 0,
                    clicks: c.stats?.clicks || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#141414" strokeOpacity={0.05} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141414', border: 'none', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="opens" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="clicks" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="max-w-6xl mx-auto space-y-8">
             <header className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-medium tracking-tight">Campaign Inbox</h1>
                <p className="text-[#141414]/60">Manage and track your generated campaigns.</p>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="animate-spin text-[#141414]" size={32} />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="bg-white rounded-[32px] p-20 text-center border-2 border-dashed border-[#141414]/10">
                   <Mail className="mx-auto text-[#141414]/20 mb-4" size={48} />
                   <h3 className="text-xl font-medium mb-2">No campaigns yet</h3>
                   <p className="text-[#141414]/40 mb-6">Start by generating your first campaign with AI.</p>
                   <button 
                     onClick={() => setActiveTab('generate')}
                     className="px-6 py-3 bg-[#141414] text-white rounded-full hover:bg-black transition-colors"
                   >
                     New Campaign
                   </button>
                </div>
              ) : (
                campaigns.map((c) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={c.id}
                    className="group bg-white p-6 rounded-[24px] border border-[#141414]/5 hover:border-[#141414]/20 transition-all shadow-sm flex items-center gap-6"
                  >
                    <div className="w-16 h-16 bg-[#141414]/5 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#141414] transition-colors">
                       <Mail className="text-[#141414] group-hover:text-white transition-colors" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h3 className="font-medium text-lg truncate mb-1">{c.name}</h3>
                       <p className="text-sm text-[#141414]/40 truncate">{c.subject}</p>
                    </div>
                    <div className="flex gap-8 text-center px-4 border-l border-[#141414]/10 border-r">
                       <div>
                         <p className="text-xs text-[#141414]/40 uppercase tracking-widest font-mono">Opens</p>
                         <p className="font-mono font-medium">{c.stats?.opens || 0}</p>
                       </div>
                       <div>
                         <p className="text-xs text-[#141414]/40 uppercase tracking-widest font-mono">Clicks</p>
                         <p className="font-mono font-medium">{c.stats?.clicks || 0}</p>
                       </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                      c.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {c.status}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="max-w-4xl mx-auto space-y-8">
             <header>
              <h1 className="text-3xl font-medium tracking-tight">Generate New Campaign</h1>
              <p className="text-[#141414]/60">Describe your audience and goals to the AI.</p>
            </header>

            {!generatedCampaign ? (
              <div className="bg-white p-8 rounded-[32px] border border-[#141414]/5 shadow-sm">
                <label className="block text-sm font-medium text-[#141414]/40 uppercase tracking-widest mb-4">Your Prompt</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A summer sale campaign for high-end sunglasses, targetted at urban professionals. Focus on style and UV protection."
                  className="w-full h-40 p-6 rounded-2xl bg-[#f5f5f5] border-none focus:ring-2 focus:ring-[#141414] resize-none text-lg transition-all"
                />
                <div className="mt-6 flex justify-end">
                  <button 
                    disabled={!prompt || isGenerating}
                    onClick={handleGenerate}
                    className="px-8 py-4 bg-[#141414] text-white rounded-full font-medium hover:bg-black transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Generating...
                      </>
                    ) : (
                      <>
                        Ignite Campaign
                        <TrendingUp size={20} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>

                {isGenerating && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-12 text-center"
                  >
                    <StepIndicator step={step} />
                    <p className="text-[#141414]/60 font-medium">
                      {step === 1 && "Drafting persuasive copy..."}
                      {step === 2 && "Synthesizing high-end visuals..."}
                      {step === 3 && "Finalizing your campaign..."}
                    </p>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                {/* Preview Card */}
                <div className="bg-white rounded-[32px] overflow-hidden border border-[#141414]/5 shadow-lg">
                  <div className="aspect-[16/9] bg-[#f5f5f5] relative flex items-center justify-center overflow-hidden">
                    {generatedCampaign.imageUrl ? (
                      <img src={generatedCampaign.imageUrl} alt="Campaign Visual" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="text-[#141414]/10" size={64} />
                    )}
                    <div className="absolute top-4 left-4 px-3 py-1 bg-white/80 backdrop-blur rounded-full text-[10px] font-bold uppercase tracking-wider">
                      AI Visual Generated
                    </div>
                  </div>
                  <div className="p-10 space-y-6">
                    <div>
                      <label className="text-[10px] font-bold text-[#141414]/30 uppercase tracking-widest block mb-2">Subject Line</label>
                      <h2 className="text-2xl font-medium leading-tight">{generatedCampaign.subject}</h2>
                    </div>
                    <div className="h-px bg-[#141414]/5" />
                    <div>
                      <label className="text-[10px] font-bold text-[#141414]/30 uppercase tracking-widest block mb-4">Body Copy</label>
                      <div className="prose prose-sm max-w-none text-lg text-[#141414]/70 leading-relaxed font-sans">
                         <ReactMarkdown>{generatedCampaign.body}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => {
                      setGeneratedCampaign(null);
                      setStep(1);
                    }}
                    className="text-[#141414]/40 hover:text-[#141414] font-medium transition-colors"
                  >
                    Start Over
                  </button>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => alert("Simulating Export...")}
                      className="px-8 py-4 bg-white border border-[#141414]/10 rounded-full font-medium hover:bg-[#f5f5f5] transition-all"
                    >
                      Export HTML
                    </button>
                    <button 
                      onClick={saveCampaign}
                      className="px-12 py-4 bg-[#141414] text-white rounded-full font-bold hover:bg-black transition-all flex items-center gap-3"
                    >
                      Save to Dashboard
                      <CheckCircle2 size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
