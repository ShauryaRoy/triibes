import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Users, Bell, Check, X, Calendar, Share2, Sparkles, Link as LinkIcon, Lock } from "lucide-react";
import { motion, useMotionValue, useMotionTemplate } from "framer-motion";
import { useState } from "react";
import { LoginDialog } from "@/components/LoginDialog";
import { Link } from "wouter";

// --- Components ---

const FloatingCard = ({ 
  children, 
  className = "", 
  delay = 0, 
  duration = 6,
  yOffset = 12 
}: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
  duration?: number;
  yOffset?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ 
      opacity: 1, 
      y: [0, -yOffset, 0],
    }}
    transition={{
      opacity: { duration: 0.6, delay },
      y: { 
        duration, 
        repeat: Infinity, 
        ease: "easeInOut",
        delay 
      }
    }}
    className={`absolute bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 ${className}`}
  >
    {children}
  </motion.div>
);

const FeatureCard = ({ title, desc, icon: Icon, delay }: any) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: any) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      onMouseMove={handleMouseMove}
      className="group relative border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-8 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300"
    >
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6 text-slate-600 dark:text-slate-400 group-hover:scale-105 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-all duration-300">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white tracking-tight">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{desc}</p>
      </div>
    </motion.div>
  );
};

const ComparisonSection = () => {
  return (
    <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
      {/* The Old Way (Chaos) */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="relative bg-slate-50 dark:bg-slate-900 rounded-[2rem] p-8 md:p-10 border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <h3 className="text-xs font-bold tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase mb-4 flex items-center gap-2">
          <X className="w-4 h-4 text-red-500" /> The Struggle
        </h3>
        <h4 className="text-3xl font-bold mb-10 text-slate-900 dark:text-white tracking-tight">The "Where's the link?" Chaos</h4>
        
        <div className="space-y-4 relative z-10">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 max-w-[85%]">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Group Chat • 10:42 AM</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">Guys, where is the dinner happening again?</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl rounded-tr-none border border-indigo-100 dark:border-indigo-800/30 max-w-[85%] ml-auto">
            <p className="text-xs text-indigo-400 dark:text-indigo-500 mb-1">You • 10:45 AM</p>
            <p className="text-sm text-indigo-900 dark:text-indigo-100">Scroll up, I sent it yesterday...</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 max-w-[85%]">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Dave • 10:46 AM</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">Wait, I thought it was next week?</p>
          </div>
        </div>
      </motion.div>

      {/* The New Way (Clarity) */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="relative bg-indigo-50 dark:bg-indigo-950/30 rounded-[2rem] p-8 md:p-10 border border-indigo-100 dark:border-indigo-900/50 overflow-hidden"
      >
        <h3 className="text-xs font-bold tracking-[0.2em] text-indigo-600 dark:text-indigo-400 uppercase mb-4 flex items-center gap-2">
          <Check className="w-4 h-4" /> The <span className="logo-font text-sm font-normal tracking-normal capitalize">Triibes</span> Way
        </h3>
        <h4 className="text-3xl font-bold mb-10 text-slate-900 dark:text-white tracking-tight">One Link. Total Clarity.</h4>

        {/* Not Tilted */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] font-bold tracking-widest bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">CONFIRMED</span>
              <h5 className="font-bold text-xl text-slate-900 dark:text-white mt-3 flex items-center gap-2">
                Birthday Dinner <span className="text-2xl">🎂</span>
              </h5>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Saturday, Oct 24 • 7:00 PM
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-center min-w-[3.5rem]">
              <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Oct</span>
              <span className="block text-2xl font-bold text-slate-900 dark:text-white leading-none mt-1">24</span>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>Mainland China, Nerul</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <Users className="w-4 h-4 text-slate-400" />
              <span>12 Going • 3 Maybe</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">G{i}</span>
                </div>
              ))}
            </div>
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold shadow-md">
              RSVP Now
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function Landing() {
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const handleLogin = () => {
    setLoginDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors duration-300">
      
      {/* NAVBAR */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        className="fixed top-0 inset-x-0 z-[100] flex justify-center p-4 sm:p-6 pointer-events-none"
      >
        <div className="pointer-events-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-full px-5 py-2.5 flex items-center gap-6 sm:gap-10 shadow-sm border border-slate-200 dark:border-slate-800 w-max max-w-[95vw]">
          <motion.span
            whileHover={{ scale: 1.05 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="logo-font font-black text-xl tracking-tighter cursor-pointer flex items-center gap-1.5 text-slate-900 dark:text-white"
          >
            Triibes<div className="w-2 h-2 rounded-full bg-indigo-500" />
          </motion.span>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <button onClick={() => document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Why <span className="logo-font text-base font-normal tracking-normal capitalize">Triibes</span>?
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Features
            </button>
          </nav>

          <Button
            onClick={handleLogin}
            className="rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-6 hover:opacity-90 transition-opacity font-semibold"
          >
            Sign In
          </Button>
        </div>
      </motion.header>

      {/* Spacer */}
      <div className="h-28" aria-hidden="true" />

      {/* HERO SECTION */}
      <section className="relative px-4 z-10 flex flex-col items-center pt-10 pb-20">
        <div className="max-w-6xl w-full mx-auto relative flex flex-col items-center">
          
          {/* Floating Cards - Top Left */}
          <FloatingCard 
            className="hidden lg:block left-0 top-10 p-5 w-52 rotate-[-2deg]" 
            delay={0.2}
            duration={7}
            yOffset={10}
          >
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-indigo-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Book the venue</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pb-2">Don't forget deposit!</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1 rounded-md">
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">Done</span>
            </div>
          </FloatingCard>

          {/* Floating Cards - Top Right */}
          <FloatingCard 
            className="hidden lg:block right-4 top-4 p-4 w-60 rotate-[2deg]" 
            delay={0.4}
            duration={8}
            yOffset={8}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Reminder</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tomorrow, 7:00 AM</p>
              </div>
            </div>
          </FloatingCard>

          {/* Hero Content - Center */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto mt-12 md:mt-24">
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                The modern way to gather
              </span>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-2 mb-6"
            >
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white">
                Plan beautifully.
              </h1>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                Gather effortlessly.
              </h1>
            </motion.div>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10 leading-relaxed font-medium"
            >
              Ditch the messy group chats. Create stunning event pages, manage RSVPs, and keep your tribe aligned in one place.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
            >
              <Button
                onClick={handleLogin}
                className="h-14 px-8 rounded-full text-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity font-bold w-full sm:w-auto shadow-lg"
              >
                Create your first event
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                onClick={() => document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' })}
                variant="outline"
                className="h-14 px-8 rounded-full text-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto font-medium shadow-sm"
              >
                See how it works
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* COMPARISON SECTION */}
      <section id="comparison" className="py-24 px-4 relative z-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">
              Why upgrade to <span className="logo-font text-indigo-600 dark:text-indigo-400 font-normal tracking-normal text-4xl md:text-6xl">Triibes</span>?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">Group chats are for memes. Triibes is for planning.</p>
          </div>
          <ComparisonSection />
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-32 px-4 relative z-10 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Everything you need to host.</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">Simple enough for a casual dinner. Powerful enough for a 500-person meetup.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              title="Beautiful Landing Pages" 
              desc="Your event deserves better than a text message. Auto-generate stunning, shareable pages."
              icon={Sparkles}
              delay={0.1}
            />
            <div className="relative group rounded-3xl overflow-hidden p-8 flex flex-col justify-center items-center text-center bg-indigo-600 dark:bg-indigo-600 shadow-xl border border-indigo-700">
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-3 text-white">Ready to host?</h3>
                <p className="text-indigo-100 mb-8 font-medium">Join the creators throwing better events.</p>
                <Button onClick={handleLogin} className="w-full rounded-xl py-6 text-lg font-bold shadow-md bg-white text-indigo-700 hover:bg-indigo-50 transition-all">
                  Create Event Free
                </Button>
              </div>
            </div>
            <FeatureCard 
              title="Approval-Based Entry" 
              desc="Curate your crowd. Let guests request to join, and you decide who gets the invite."
              icon={Lock}
              delay={0.2}
            />
            <FeatureCard 
              title="Smart Analytics" 
              desc="Track RSVPs, estimated revenue, and capacity limits beautifully from your dashboard."
              icon={Check}
              delay={0.3}
            />
            <FeatureCard 
              title="Hidden Locations" 
              desc="Keep the specific venue coordinates private until a guest is strictly approved by you."
              icon={MapPin}
              delay={0.4}
            />
            <FeatureCard 
              title="One Universal Link" 
              desc="Works flawlessly in Instagram bios, TikTok, WhatsApp, and loads with rich previews."
              icon={LinkIcon}
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-4 relative overflow-hidden bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-12 md:p-20 relative overflow-hidden shadow-sm"
          >
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-slate-900 dark:text-white">
                Gather your tribe.
              </h2>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto font-medium">
                Triibes is the simple way to plan events and track RSVPs. Stop managing chaos.
              </p>
              <Button
                size="lg"
                onClick={handleLogin}
                className="h-16 px-12 text-xl rounded-full bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 transition-all font-bold shadow-lg"
              >
                Get Started
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="logo-font font-black text-2xl text-slate-900 dark:text-white">Triibes.</span>
          </div>
          
          <div className="flex gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Twitter</a>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-500">© 2026 Triibes Inc.</p>
        </div>
      </footer>

      <LoginDialog 
        open={loginDialogOpen} 
        onOpenChange={setLoginDialogOpen}
      />
    </div>
  );
}
