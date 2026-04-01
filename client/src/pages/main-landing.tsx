import { useEffect, useState } from "react";
import { LoginDialog } from "@/components/LoginDialog";
import { motion } from "framer-motion";

const MaterialSymbolsHref =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";

export default function MainLanding() {
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  useEffect(() => {
    const ensureStylesheet = (id: string, href: string) => {
      let link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
    };

    ensureStylesheet("triibes-main-landing-material-symbols", MaterialSymbolsHref);
  }, []);

  return (
    <div className="overflow-x-hidden bg-[#fafafa] text-[#1a1a1a] font-sans">
      <style>{`
        .ml-soft-glow { box-shadow: 0 0 40px rgba(138, 43, 226, 0.1); }
        .ml-text-gradient {
          background: linear-gradient(135deg, #8A2BE2, #A5A6F6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .ml-glass-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(138, 43, 226, 0.1);
        }
        .ml-vibe-gradient { background: linear-gradient(135deg, #8A2BE2 0%, #A5A6F6 100%); }
      `}</style>

      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="fixed top-0 inset-x-0 z-[100] flex justify-center p-6 pointer-events-none"
      >
        <div className="pointer-events-auto bg-white/80 backdrop-blur-xl rounded-full pl-6 pr-2 py-2 flex items-center gap-4 md:gap-8 shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-gray-200/50">
          <motion.span
            whileHover={{ scale: 1.05 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="logo-font font-black text-xl tracking-tighter cursor-pointer flex items-center gap-1 mr-4"
          >
            Triibes<div className="w-2 h-2 rounded-full bg-indigo-500" />
          </motion.span>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <button
              onClick={() => document.getElementById("events-preview")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-gray-900 transition-colors"
            >
              Explore
            </button>
            <button
              onClick={() => document.getElementById("tribes")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-gray-900 transition-colors"
            >
              Meetups
            </button>
            <button
              onClick={() => document.getElementById("social-proof")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-gray-900 transition-colors"
            >
              Stories
            </button>
          </nav>

          <button
            onClick={() => setLoginDialogOpen(true)}
            className="rounded-full bg-gray-900 text-white px-6 py-3 hover:bg-gray-800 hover:scale-[1.02] transition-all shadow-sm font-medium"
          >
            Get started
          </button>
        </div>
      </motion.header>

      <div className="h-24" aria-hidden="true" />

      <header className="relative flex min-h-[92vh] items-center justify-center overflow-hidden pt-10">
        <div className="absolute inset-0 z-0">
          <img
            alt="Urban energy"
            className="h-full w-full object-cover opacity-20"
            src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1920&q=80"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#fafafa] via-transparent to-[#fafafa]"></div>
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8A2BE2]/10 blur-[120px]"></div>
        </div>

        <div className="container relative z-10 mx-auto px-6 text-center">
          <h1 className="ml-headline mb-10 text-5xl font-black leading-[0.9] tracking-tighter text-[#1a1a1a] md:text-7xl lg:text-8xl">
            Something's
            <br />
            <span className="ml-text-gradient inline-block -rotate-1 italic">HAPPENING</span>
            <br />
            today.
          </h1>

          <div className="mb-10 flex justify-center">
            <button
              onClick={() => setLoginDialogOpen(true)}
              className="ml-vibe-gradient ml-soft-glow rounded-full px-8 py-3 text-sm font-extrabold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_14px_34px_rgba(138,43,226,0.28)] active:scale-95"
            >
              Login / Sign up
            </button>
          </div>

          <div className="relative mx-auto h-[320px] max-w-3xl">
            <div className="ml-glass-card absolute left-1/2 top-0 z-20 w-[280px] -translate-x-1/2 -rotate-1 rounded-2xl p-5 shadow-2xl transition-all duration-500 hover:rotate-0">
              <div className="mb-4 flex items-start justify-between">
                <span className="rounded-full bg-[#8A2BE2]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A2BE2]">
                  LIVE NOW
                </span>
                <span className="text-xs font-bold text-[#666666]">1:30 PM</span>
              </div>
              <h3 className="ml-headline mb-1 text-left text-2xl font-black text-[#1a1a1a]">Rooftop Jam</h3>
              <div className="mb-4 flex items-center gap-2 text-sm text-[#666666]">
                <span className="material-symbols-outlined text-sm">location_on</span>
                <span className="font-medium">The Highline Loft</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <img
                    alt="User"
                    className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80"
                  />
                  <img
                    alt="User"
                    className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80"
                  />
                </div>
                <span className="animate-pulse text-[10px] font-black uppercase tracking-widest text-[#FF6DBF]">
                  Filling Fast
                </span>
              </div>
            </div>

            <div className="ml-glass-card absolute left-0 top-16 z-10 hidden w-[240px] -rotate-6 rounded-2xl p-3.5 shadow-2xl transition-all duration-500 hover:-rotate-3 md:block">
              <div className="relative mb-3 h-24 overflow-hidden rounded-lg">
                <img
                  alt="Sunset Dinner"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=600&q=80"
                />
              </div>
              <h4 className="ml-headline text-left text-lg font-black text-[#1a1a1a]">Secret Garden Dinner</h4>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#666666]">
                <span className="material-symbols-outlined text-xs">calendar_today</span>
                <span className="font-medium">Tonight, 7:00 PM</span>
              </div>
            </div>

            <div className="ml-glass-card absolute right-0 top-10 z-10 hidden w-[240px] rotate-6 rounded-2xl p-3.5 shadow-2xl transition-all duration-500 hover:rotate-3 md:block">
              <div className="relative mb-3 h-24 overflow-hidden rounded-lg">
                <img
                  alt="Trail Run"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=600&q=80"
                />
              </div>
              <h4 className="ml-headline text-left text-lg font-black text-[#1a1a1a]">Canyon Trail Run</h4>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#666666]">
                <span className="material-symbols-outlined text-xs">people</span>
                <span className="font-medium">12 People Going</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="events-preview" className="bg-white px-6 py-24">
        <div className="container mx-auto">
          <div className="mb-14 flex flex-col items-end justify-between gap-8 md:flex-row">
            <h2 className="ml-headline text-4xl font-black uppercase leading-[0.85] tracking-tighter text-[#1a1a1a] md:text-6xl">
              View events
              <br />
              <span className="text-[#8A2BE2]">near you</span>
            </h2>
            <p className="max-w-xs border-l-2 border-[#A5A6F6] pl-6 text-sm font-medium italic text-[#666666]">
              The city is breathing. Don't stay inside today.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="group relative rounded-2xl bg-[#fafafa] p-2 shadow-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-xl md:-translate-y-8">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
                <img
                  alt="Football"
                  className="h-full w-full object-cover transition-all duration-700"
                  src="https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&w=800&q=80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/10 to-transparent opacity-60"></div>
                <div className="absolute bottom-6 left-6">
                  <h4 className="ml-headline text-2xl font-black uppercase tracking-tighter text-[#1a1a1a]">
                    5-a-side Football
                  </h4>
                  <p className="mt-2 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-widest text-[#8A2BE2] backdrop-blur-md">
                    7/10 spots filled
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative rounded-2xl bg-[#fafafa] p-2 shadow-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-xl">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
                <img
                  alt="Coffee"
                  className="h-full w-full object-cover transition-all duration-700"
                  src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/10 to-transparent opacity-60"></div>
                <div className="ml-vibe-gradient absolute right-6 top-6 rounded-full px-4 py-1.5 text-[10px] font-black text-white shadow-lg">
                  STARTS IN 1 HR
                </div>
                <div className="absolute bottom-6 left-6">
                  <h4 className="ml-headline text-2xl font-black uppercase tracking-tighter text-[#1a1a1a]">
                    Coffee Meetup
                  </h4>
                  <p className="mt-2 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-widest text-[#666666] backdrop-blur-md">
                    6 going
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative rounded-2xl bg-[#fafafa] p-2 shadow-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-xl md:translate-y-12">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
                <img
                  alt="Music"
                  className="h-full w-full object-cover transition-all duration-700"
                  src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/10 to-transparent opacity-60"></div>
                <div className="absolute bottom-6 left-6">
                  <h4 className="ml-headline text-2xl font-black uppercase tracking-tighter text-[#1a1a1a]">
                    Techno Session
                  </h4>
                  <p className="mt-2 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-widest text-[#FF6DBF] backdrop-blur-md">
                    Exclusive • 2 Left
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tribes" className="relative overflow-hidden bg-[#fafafa] py-28">
        <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[#A5A6F6]/10 blur-[150px]"></div>
        <div className="container relative z-10 mx-auto px-6">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
            <div className="order-2 relative lg:order-1">
              <div className="relative aspect-video w-full -rotate-2 overflow-hidden rounded-3xl border-8 border-white shadow-2xl">
                <img
                  alt="Tribe meeting"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80"
                />
              </div>
              <div className="absolute -bottom-10 -right-10 h-56 w-56 rotate-3 overflow-hidden rounded-3xl border-8 border-white shadow-2xl">
                <img
                  alt="City walk"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=600&q=80"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="ml-headline mb-8 text-4xl font-black uppercase leading-none tracking-tighter text-[#1a1a1a] md:text-6xl">
                Join your
                <br />
                 <span className="ml-text-gradient">tribe</span>
              </h2>
              <p className="mb-10 max-w-lg text-lg font-medium leading-relaxed text-[#666666]">
                Events are great, but rituals are better. Find the people who show up every Tuesday, every weekend,
                every time. Consistency is the new cool.
              </p>
              <div className="flex flex-col gap-5">
                <div className="group flex items-center gap-5 rounded-2xl border border-[#8A2BE2]/5 bg-white p-6 transition-all hover:border-[#8A2BE2]/20 hover:shadow-lg">
                  <span className="material-symbols-outlined rounded-xl bg-[#8A2BE2]/5 p-3 text-4xl text-[#8A2BE2]">
                    groups
                  </span>
                  <div>
                    <h5 className="text-lg font-black text-[#1a1a1a]">Digital Creatives Tribe</h5>
                    <p className="text-sm font-medium text-[#666666]">Weekly mid-day co-working and coffee</p>
                  </div>
                </div>

                <div className="group flex items-center gap-5 rounded-2xl border border-[#8A2BE2]/5 bg-white p-6 transition-all hover:border-[#8A2BE2]/20 hover:shadow-lg">
                  <span className="material-symbols-outlined rounded-xl bg-[#A5A6F6]/5 p-3 text-4xl text-[#A5A6F6]">
                    fitness_center
                  </span>
                  <div>
                    <h5 className="text-lg font-black text-[#1a1a1a]">Day Runners Collective</h5>
                    <p className="text-sm font-medium text-[#666666]">Mon/Wed 7 AM urban sprints</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="social-proof" className="border-y border-[#E5E5E5] bg-white py-24">
        <div className="container mx-auto px-6 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-10 flex -space-x-5">
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white shadow-lg ring-4 ring-[#8A2BE2]/20">
                <img
                  alt="User"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80"
                />
              </div>
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white shadow-lg ring-4 ring-[#FF6DBF]/20">
                <img
                  alt="User"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=160&q=80"
                />
              </div>
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white shadow-lg ring-4 ring-[#A5A6F6]/20">
                <img
                  alt="User"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80"
                />
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-[#1A1A1A] text-xl font-black text-white shadow-lg">
                120+
              </div>
            </div>

            <h3 className="ml-headline mb-6 text-3xl font-black uppercase tracking-tighter text-[#1a1a1a] md:text-5xl">
              Real connections
              <br />
              happening now
            </h3>
            <p className="mx-auto max-w-md font-medium text-[#666666]">
              Join 120+ active people across the city. Don't be the one scrolling through stories later.
            </p>
          </div>
        </div>
      </section>

      <section className="relative flex flex-col items-center justify-center overflow-hidden bg-[#fafafa] py-32">
        <div className="absolute inset-0 bg-gradient-to-t from-[#8A2BE2]/10 to-transparent"></div>
        <div className="relative z-10 px-6 text-center">
          <h2 className="ml-headline mx-auto mb-12 max-w-5xl text-4xl font-black uppercase leading-none tracking-tighter text-[#1a1a1a] md:text-7xl">
            Ready to find
            <br />
            <span className="ml-text-gradient italic">your pulse?</span>
          </h2>
          <button
            className="ml-vibe-gradient group relative rounded-full px-12 py-6 text-xl font-black uppercase tracking-wider text-white shadow-2xl transition-all duration-300 hover:shadow-[#8A2BE2]/40 active:scale-95"
            onClick={() => setLoginDialogOpen(true)}
          >
            Find your scene.
            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-[#FF6DBF]"></span>
          </button>
          
        </div>
      </section>

      

      <nav className="fixed bottom-6 left-6 right-6 z-50 flex h-20 items-center justify-around rounded-full border border-[#8A2BE2]/10 bg-white/90 px-4 shadow-2xl backdrop-blur-2xl md:hidden">
        <a className="flex flex-col items-center justify-center rounded-full bg-[#8A2BE2]/5 p-3 text-[#8A2BE2] transition-all" href="#">
          <span className="material-symbols-outlined">explore</span>
        </a>
        <a className="flex flex-col items-center justify-center p-3 text-[#666666] hover:text-[#8A2BE2]" href="#">
          <span className="material-symbols-outlined">groups</span>
        </a>
        <a className="flex flex-col items-center justify-center p-3 text-[#666666] hover:text-[#8A2BE2]" href="#">
          <span className="material-symbols-outlined">chat_bubble</span>
        </a>
        <a className="flex flex-col items-center justify-center p-3 text-[#666666] hover:text-[#8A2BE2]" href="#">
          <span className="material-symbols-outlined">person</span>
        </a>
      </nav>

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </div>
  );
}
