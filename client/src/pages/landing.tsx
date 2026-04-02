import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, MapPin, Users, Bell, Check, X, Calendar, Share2, Sparkles, MessageCircle, Lightbulb, Shield, Eye, Clock, Zap } from "lucide-react";
import { motion, useMotionValue, useMotionTemplate } from "framer-motion";
import { useState, useEffect } from "react";
import { LoginDialog } from "@/components/LoginDialog";

// --- Components ---

// Floating Card Component with drift animation
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
    className={`absolute bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 ${className}`}
  >
    {children}
  </motion.div>
);

// Dotted background pattern
const DottedBackground = () => (
  <div 
    className="absolute inset-0 opacity-[0.4]"
    style={{
      backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
      backgroundSize: '24px 24px'
    }}
  />
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
      className="group relative border border-gray-200 bg-white rounded-2xl p-8 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-gray-300 transition-all duration-300 overflow-hidden"
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(99, 102, 241, 0.06),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-6 text-gray-700 group-hover:scale-105 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all duration-300">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-gray-900">{title}</h3>
        <p className="text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
};

const ComparisonSection = () => {
  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
      {/* The Old Way (Chaos) */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="relative bg-gray-50 rounded-3xl p-8 border border-gray-200 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full blur-3xl opacity-50" />
        <h3 className="text-sm font-bold tracking-widest text-red-500 uppercase mb-6 flex items-center gap-2">
          <X className="w-4 h-4" /> The Struggle
        </h3>
        <h4 className="text-2xl font-bold mb-8 text-gray-800">The "Where's the link?" Chaos</h4>
        
        <div className="space-y-4 relative z-10">
          <div className="bg-white p-4 rounded-xl rounded-tl-none shadow-sm border border-gray-100 max-w-[90%] transform -rotate-1">
            <p className="text-xs text-gray-500 mb-1">Group Chat • 10:42 AM</p>
            <p className="text-sm text-gray-800">Guys, where is the dinner happening again?</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl rounded-tr-none shadow-sm border border-blue-100 max-w-[90%] ml-auto transform rotate-1">
            <p className="text-xs text-blue-400 mb-1">You • 10:45 AM</p>
            <p className="text-sm text-gray-800">Scroll up, I sent it yesterday...</p>
          </div>
          <div className="bg-white p-4 rounded-xl rounded-tl-none shadow-sm border border-gray-100 max-w-[90%] transform -rotate-1">
            <p className="text-xs text-gray-500 mb-1">Dave • 10:46 AM</p>
            <p className="text-sm text-gray-800">Wait, I thought it was next week?</p>
          </div>
          <div className="bg-white p-4 rounded-xl rounded-tl-none shadow-sm border border-gray-100 max-w-[90%] transform rotate-1 opacity-70">
            <p className="text-xs text-gray-500 mb-1">Sarah • 10:50 AM</p>
            <p className="text-sm text-gray-800">Can I bring a +1?</p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-gray-50 to-transparent" />
      </motion.div>

      {/* The New Way (Clarity) */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-[100px] opacity-20" />
        <h3 className="text-sm font-bold tracking-widest text-blue-200 uppercase mb-6 flex items-center gap-2">
          <Check className="w-4 h-4" /> The <span className="logo-font font-normal tracking-normal text-lg ms-1">Triibes</span> Way
        </h3>
        <h4 className="text-2xl font-bold mb-8">One Link. Total Clarity.</h4>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-inner relative z-10 transition-transform hover:scale-[1.02] duration-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-xs font-semibold bg-green-400/20 text-green-300 px-2 py-1 rounded-full border border-green-400/30">CONFIRMED</span>
              <h5 className="font-bold text-xl mt-2">Birthday Dinner 🎂</h5>
              <p className="text-blue-100 text-sm mt-1">Saturday, Oct 24 • 7:00 PM</p>
            </div>
            <div className="bg-white rounded-lg p-2 shadow-lg">
              <span className="block text-center text-xs text-gray-500 uppercase font-bold">Oct</span>
              <span className="block text-center text-xl font-bold text-gray-900">24</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-blue-100">
              <MapPin className="w-4 h-4" />
              <span>Mainland China, Nerul</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-blue-100">
              <Users className="w-4 h-4" />
              <span>12 Going • 3 Maybe</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 flex gap-2">
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-600 bg-indigo-300" />
              ))}
            </div>
            <Button size="sm" className="ml-auto bg-white text-blue-600 hover:bg-blue-50 font-bold shadow-lg">
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
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 overflow-hidden relative selection:bg-blue-100">
      
      {/* NAVBAR */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="fixed top-0 inset-x-0 z-[100] flex justify-center p-6 pointer-events-none"
      >
        <div className="pointer-events-auto bg-white/80 backdrop-blur-xl rounded-full pl-6 pr-2 py-2 flex items-center gap-4 md:gap-8 shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-gray-200/50">
          <motion.span
            whileHover={{ scale: 1.05 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="logo-font font-black text-xl tracking-tighter cursor-pointer flex items-center gap-1 mr-4"
          >
            Triibes<div className="w-2 h-2 rounded-full bg-indigo-500" />
          </motion.span>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <button onClick={() => document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-gray-900 transition-colors">
              Why <span className="logo-font font-normal tracking-normal text-lg">Triibes</span>?
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-gray-900 transition-colors">
              Features
            </button>
            <button onClick={() => document.getElementById('use-cases')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-gray-900 transition-colors">
              Use Cases
            </button>
          </nav>

          <Button
            onClick={handleLogin}
            className="rounded-full bg-gray-900 text-white px-6 py-5 hover:bg-gray-800 hover:scale-[1.02] transition-all shadow-sm font-medium"
          >
            Get started
          </Button>
        </div>
      </motion.header>

      {/* Spacer so content starts below fixed navbar */}
      <div className="h-24" aria-hidden="true" />

      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] px-4 z-10 flex flex-col items-center justify-center overflow-hidden">
        {/* Dotted background pattern */}
        <DottedBackground />
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#f8f9fa]/80 pointer-events-none" />

        <div className="max-w-6xl w-full mx-auto relative">
          
          {/* Floating Cards - Top Left: Sticky Note */}
          <FloatingCard 
            className="hidden lg:block left-0 top-8 p-4 w-48 rotate-[-3deg]" 
            delay={0.2}
            duration={7}
            yOffset={10}
          >
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Book the venue</p>
                <p className="text-xs text-gray-500 mt-1">Don't forget deposit!</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">Completed</span>
            </div>
          </FloatingCard>

          {/* Floating Cards - Top Right: Reminder/Notification */}
          <FloatingCard 
            className="hidden lg:block right-0 top-4 p-4 w-56 rotate-[2deg]" 
            delay={0.4}
            duration={8}
            yOffset={14}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Reminder</p>
                <p className="text-xs text-gray-500">Tomorrow, 7:00 AM</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-600">Run at beside the lake</p>
            </div>
          </FloatingCard>

          {/* Floating Cards - Bottom Left: RSVP Progress */}
          <FloatingCard 
            className="hidden lg:block left-4 bottom-16 p-4 w-52 rotate-[3deg]" 
            delay={0.6}
            duration={6}
            yOffset={12}
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Guest RSVPs</p>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-indigo-200 border-2 border-white" />
                <div className="w-7 h-7 rounded-full bg-emerald-200 border-2 border-white" />
                <div className="w-7 h-7 rounded-full bg-amber-200 border-2 border-white" />
                <div className="w-7 h-7 rounded-full bg-rose-200 border-2 border-white" />
              </div>
              <span className="text-xs text-gray-600">+8 more</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full" />
            </div>
            <p className="text-xs text-gray-500 mt-2">12 of 16 confirmed</p>
          </FloatingCard>

          {/* Floating Cards - Bottom Right: Integrations */}
          <FloatingCard 
            className="hidden lg:block right-8 bottom-24 p-4 w-48 rotate-[-2deg]" 
            delay={0.8}
            duration={7}
            yOffset={10}
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Works with</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <Share2 className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </FloatingCard>

          {/* Hero Content - Center */}
          <div className="relative z-10 flex flex-col items-center text-center py-20">
            
            {/* App Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-200 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-gray-900 mb-2"
            >
              Plan, share, and organize
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.1] text-gray-400 mb-8"
            >
              events in one place
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed"
            >
              Create beautiful event pages, track RSVPs, and keep everyone aligned — without group chat chaos.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <Button
                onClick={handleLogin}
                className="h-auto py-4 px-8 rounded-full text-base bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 font-medium"
              >
                Create an event
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center gap-3 text-gray-500 text-sm mt-10"
            >
              
            </motion.div>
          </div>
        </div>
      </section>

      {/* COMPARISON SECTION */}
      <section id="comparison" className="py-32 px-4 bg-white relative z-10">
        <div className="max-w-6xl mx-auto mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">Why upgrade to <span className="logo-font font-normal tracking-normal text-6xl">Triibes</span>?</h2>
          <p className="text-xl text-gray-500">We love group chats for chatting. Not for planning.</p>
        </div>
        <ComparisonSection />
      </section>

      {/* FEATURES OFFSET GRID */}
      <section id="features" className="py-32 px-4 relative z-10 bg-[#f8f9fa]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">Everything you need to host.</h2>
            <p className="text-lg text-gray-500">Simple enough for a casual dinner. Powerful enough for a 500-person meetup.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-8 mt-0 md:mt-12">
              <FeatureCard 
                title="Beautiful Pages" 
                desc="Automatically generate a stunning landing page for your event with maps, times, and details."
                icon={Sparkles}
                delay={0}
              />
              <FeatureCard 
                title="Rich Notifications" 
                desc="Send reminders via email or WhatsApp without manually messaging everyone."
                icon={Bell}
                delay={0.2}
              />
            </div>
            
            <div className="space-y-8">
              <FeatureCard 
                title="Smart RSVPs" 
                desc="Track who is coming, who is maybe, and who can't make it. Download guest lists instantly."
                icon={Check}
                delay={0.1}
              />
              <div className="p-8 bg-indigo-600 rounded-2xl text-white text-center flex flex-col items-center justify-center min-h-[300px] shadow-lg shadow-indigo-200 relative overflow-hidden group hover:scale-[1.01] transition-transform">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <h3 className="text-3xl font-bold mb-4 relative z-10">Ready to host?</h3>
                <Button onClick={handleLogin} variant="secondary" className="rounded-full px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl relative z-10 bg-white text-indigo-600 hover:bg-gray-50">
                  Create Event
                </Button>
              </div>
            </div>

            <div className="space-y-8 mt-0 md:mt-24">
              <FeatureCard 
                title="Location Locked" 
                desc="Keep the specific location private until guests are approved or RSVP."
                icon={MapPin}
                delay={0.3}
              />
              <FeatureCard 
                title="Share Anywhere" 
                desc="One link works on Instagram, TikTok, WhatsApp, and iMessage previews."
                icon={Share2}
                delay={0.4}
              />
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES STRIP */}
      <section id="use-cases" className="py-20 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 md:gap-12 opacity-70">
            {["Run Clubs", "Book Clubs", "Tech Meetups", "Birthdays", "Dinner Parties", "Workshops"].map((item) => (
              <span key={item} className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-400 to-gray-600">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-40 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-black text-white rounded-[3rem] p-12 md:p-24 relative overflow-hidden shadow-2xl"
          >
            {/* Animated Background in CTA */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black z-0" />
              <motion.div 
                animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-600/20 blur-[120px] rounded-full" 
              />
              <motion.div 
                animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-600/20 blur-[120px] rounded-full" 
              />
            </div>

            <div className="relative z-10">
              <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-8">
                Gather your tribe.
              </h2>
              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                Join thousands of hosts who have switched to <span className="logo-font font-normal tracking-normal text-2xl">Triibes</span> for stress-free event planning.
              </p>
              <Button
                size="lg"
                onClick={handleLogin}
                className="h-auto py-6 px-12 text-xl rounded-full bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all font-bold shadow-2xl"
              >
                Get Started Now
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-4 border-t border-gray-100 bg-white relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-gray-600">
          <div className="flex items-center gap-2">
            <span className="logo-font font-black text-2xl text-black">Triibes.</span>
          </div>
          
          <div className="flex gap-8 text-sm font-medium">
            <a href="#" className="hover:text-black">Terms</a>
            <a href="#" className="hover:text-black">Privacy</a>
            <a href="#" className="hover:text-black">Twitter</a>
          </div>

          <p className="text-sm">© 2026 <span className="logo-font font-normal tracking-normal text-base">Triibes</span> Inc.</p>
        </div>
      </footer>

      <LoginDialog 
        open={loginDialogOpen} 
        onOpenChange={setLoginDialogOpen}
      />
    </div>
  );
}
