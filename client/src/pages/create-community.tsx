import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { SimpleBackground } from "@/components/simple-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateSlugFromName, generateRandomSlug, getSlugValidationError } from "@shared/slug-utils";
import { Camera, Image as ImageIcon, Globe, Lock, Info, Link as LinkIcon, Sparkles, MapPin, ChevronLeft, CheckCircle2 } from "lucide-react";

export default function CreateCommunity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [scope, setScope] = useState<"city" | "global">("city");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("general");
  const [isPublic, setIsPublic] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverError, setCoverError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const categories = [
    { value: "general", label: "General" },
    { value: "technology", label: "Technology" },
    { value: "business", label: "Business" },
    { value: "health", label: "Health & Fitness" },
    { value: "education", label: "Education" },
    { value: "entertainment", label: "Entertainment" },
    { value: "gaming", label: "Gaming" },
    { value: "sports", label: "Sports" },
    { value: "travel", label: "Travel" },
    { value: "food", label: "Food & Drink" },
    { value: "arts", label: "Arts & Culture" },
    { value: "science", label: "Science" },
    { value: "social", label: "Social" },
    { value: "hobbies", label: "Hobbies" },
    { value: "other", label: "Other" },
  ];

  // Auto-generate slug from name
  useEffect(() => {
    if (name && !slug) {
      const generatedSlug = generateSlugFromName(name);
      setSlug(generatedSlug);
    }
  }, [name]);

  // Validate slug format
  const handleSlugChange = (value: string) => {
    const newSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(newSlug);
    
    const error = getSlugValidationError(newSlug);
    setSlugError(error);
    
    // Check uniqueness if format is valid
    if (!error && newSlug.length >= 3) {
      checkSlugUniqueness(newSlug);
    }
  };

  // Check if slug is unique
  const checkSlugUniqueness = async (slugToCheck: string) => {
    setIsCheckingSlug(true);
    try {
      const res = await fetch(`/api/groups/check-slug?slug=${encodeURIComponent(slugToCheck)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      
      if (!data.available) {
        setSlugError("This slug is already taken");
      } else {
        setSlugError(null);
      }
    } catch (error) {
      console.error("Error checking slug:", error);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  // Generate random slug
  const handleGenerateRandomSlug = () => {
    const randomSlug = generateRandomSlug();
    setSlug(randomSlug);
    setSlugError(null);
    checkSlugUniqueness(randomSlug);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      
      const requestBody = {
        name,
        description,
        category,
        isPublic,
        slug: slug || undefined, // Send undefined if empty, backend will auto-generate
        imageUrl: avatarUrl || "/static/frog butcher.png",
        coverImageUrl: coverUrl,
        settings: {
          scope,
          city,
        },
      };
      
      
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create group");
      }
      
      const community = await res.json();

      
      return community;
    },
    onSuccess: (community) => {
      
      const groupIdentifier = community.slug || community.id;
      
      toast({ title: "Group created", description: `${community.name} is live.` });
      
      // Invalidate queries and pre-populate cache with the new group
      queryClient.invalidateQueries({ queryKey: ["/api/profile/groups"] });
      queryClient.setQueryData([`/api/groups/${groupIdentifier}`], community);
      
      // Navigate after ensuring data is in cache
      navigate(`/groups/${groupIdentifier}`);
     
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast({ 
        title: "Creation failed", 
        description: error.message || "Please sign in and try again.", 
        variant: "destructive" 
      });
    },
  });

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;


    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Upload error:', errorData);
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await res.json();
      setCoverUrl(data.url);
      setCoverError(false);
      toast({ title: 'Cover uploaded', description: 'Cover image updated successfully.' });
    } catch (error) {
      console.error('Cover upload error:', error);
      toast({ title: 'Upload failed', description: `Could not upload cover image: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' });
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected for logo upload');
      return;
    }


    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      console.log('Logo upload response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Logo upload error:', errorData);
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await res.json();
 
      
      setAvatarUrl(data.url);
      setLogoError(false);
      toast({ title: 'Logo uploaded', description: 'Logo updated successfully.' });
      
      console.log('Avatar URL state updated to:', data.url);
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({ title: 'Upload failed', description: `Could not upload logo: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' });
    }
  };

  return (
    <SimpleBackground className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-24 md:pt-32 pb-24">
        {/* Breadcrumb / Back Navigation */}
        <div className="mb-8">
          <Link href="/groups" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
            Back to Groups
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Content */}
          <div className="lg:col-span-7 space-y-8">
            <header className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                Launch your <span className="text-primary">Triibe</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Create a space for your community to connect, coordinate, and grow.
              </p>
            </header>

            <section className="space-y-6">
              {/* Group Identity Card */}
              <Card className="bg-card/50 border-border shadow-2xl backdrop-blur-sm overflow-hidden rounded-3xl">
                <CardContent className="p-6 md:p-8 space-y-8">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Identity & Details</h3>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Group Name</label>
                      <Input 
                        placeholder="e.g. Minimalist Designers, Sunday Runners" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="h-12 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground/50 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all font-medium" 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Category</label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="h-12 bg-muted/40 border-border text-foreground rounded-2xl focus:ring-2 focus:ring-primary/50 font-medium">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border rounded-2xl shadow-2xl backdrop-blur-xl">
                            {categories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value} className="text-foreground hover:bg-accent rounded-lg m-1 cursor-pointer">
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                         <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">City (Optional)</label>
                         <div className="relative">
                           <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                           <Input 
                             placeholder="e.g. Mumbai, New York" 
                             value={city} 
                             onChange={(e) => setCity(e.target.value)} 
                             className="h-12 pl-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground/50 rounded-2xl focus:ring-2 focus:ring-primary/50 font-medium" 
                           />
                         </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">About the Group</label>
                      <Textarea 
                        placeholder="What is this triibe for? Share the vision..." 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground/50 rounded-2xl min-h-[140px] focus:ring-2 focus:ring-primary/50 p-4 font-medium leading-relaxed" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* URL Selection Card */}
              <Card className="bg-card/50 border-border shadow-2xl backdrop-blur-sm overflow-hidden rounded-3xl">
                <CardContent className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                      <LinkIcon className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Public URL</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-border group focus-within:ring-2 focus-within:ring-primary/50 transition-all bg-muted/20">
                      <span className="hidden sm:flex text-muted-foreground text-sm bg-muted px-4 items-center whitespace-nowrap border-r border-border font-medium">
                        triibes.in/groups/
                      </span>
                      <Input 
                        placeholder="your-custom-slug" 
                        value={slug} 
                        onChange={(e) => handleSlugChange(e.target.value)} 
                        className="h-12 bg-transparent border-0 text-foreground placeholder:text-muted-foreground/50 rounded-none flex-1 font-bold text-base" 
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                      <div className="flex-1 min-w-0">
                        {isCheckingSlug ? (
                          <p className="text-xs text-blue-500 flex items-center gap-1.5 font-medium animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Checking availability...
                          </p>
                        ) : slugError ? (
                          <p className="text-xs text-destructive flex items-center gap-1.5 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> {slugError}
                          </p>
                        ) : slug && !slugError ? (
                          <p className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> This URL is available
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground font-medium">Max 24 characters, lowercase only.</p>
                        )}
                      </div>
                      <Button 
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateRandomSlug}
                        className="text-xs font-bold text-primary hover:bg-primary/10 rounded-full h-8 px-3 transition-colors"
                      >
                        🎲 Magic Generate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Privacy Setting Card */}
              <Card className="bg-card/50 border-border shadow-2xl backdrop-blur-sm overflow-hidden rounded-3xl">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                      <Lock className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Privacy Setting</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div 
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden group ${
                        isPublic 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border bg-muted/40 hover:bg-accent/50'
                      }`}
                      onClick={() => setIsPublic(true)}
                    >
                      {isPublic && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary fill-background" />}
                      <div className="space-y-2">
                        <div className={`p-2 w-fit rounded-lg ${isPublic ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-accent transition-colors'}`}>
                          <Globe className="h-5 w-5" />
                        </div>
                        <h4 className={`font-bold ${isPublic ? 'text-foreground' : 'text-muted-foreground'}`}>Public</h4>
                        <p className="text-muted-foreground text-xs leading-relaxed">Anyone can find and join your group instantly.</p>
                      </div>
                    </div>
                    
                    <div 
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden group ${
                        !isPublic 
                          ? 'border-orange-500 bg-orange-500/10' 
                          : 'border-border bg-muted/40 hover:bg-accent/50'
                      }`}
                      onClick={() => setIsPublic(false)}
                    >
                      {!isPublic && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-orange-500 fill-background" />}
                      <div className="space-y-2">
                        <div className={`p-2 w-fit rounded-lg ${!isPublic ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground group-hover:bg-accent transition-colors'}`}>
                          <Lock className="h-5 w-5" />
                        </div>
                        <h4 className={`font-bold ${!isPublic ? 'text-foreground' : 'text-muted-foreground'}`}>Closed</h4>
                        <p className="text-muted-foreground text-xs leading-relaxed">You must approve new members before they can join.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Right Column: Visual Preview & Uploads */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-32">
            <Card className="bg-card border-border shadow-2xl overflow-hidden rounded-3xl">
              <CardContent className="p-0">
                {/* Visual Preview Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-3 w-3" /> Live Preview
                  </span>
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-border" />
                    <div className="h-2 w-2 rounded-full bg-border" />
                    <div className="h-2 w-2 rounded-full bg-border" />
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  {/* Digital Paper / Card Preview */}
                  <div className="relative rounded-2xl border border-border overflow-hidden bg-background shadow-2xl">
                    {/* Cover Preview */}
                    <div 
                      className={`aspect-[3/1] w-full bg-muted flex items-center justify-center relative transition-all duration-500 ${!coverUrl ? 'animate-pulse' : ''}`}
                      style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                    >
                      {!coverUrl && (
                        <div className="flex flex-col items-center text-muted-foreground/50 transition-all group">
                          <ImageIcon className="h-8 w-8 mb-2 opacity-50 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">Missing Cover</span>
                        </div>
                      )}
                      
                      <div className="absolute top-3 right-3">
                        <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" id="cover-upload" />
                        <label htmlFor="cover-upload" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-background/60 text-foreground shadow-xl backdrop-blur-md hover:bg-background/80 active:scale-95 cursor-pointer transition-all border border-border">
                          <Camera className="h-3.5 w-3.5" />
                          {coverUrl ? 'Edit' : 'Upload'}
                        </label>
                      </div>
                    </div>

                    {/* Logo & Info Preview */}
                    <div className="p-5 pt-0 -mt-8 relative z-10 flex flex-col items-center">
                      <div className="relative group">
                        <div 
                          className={`h-22 w-22 rounded-2xl border-4 border-background bg-card overflow-hidden shadow-2xl transition-all duration-500 ${!avatarUrl ? 'animate-pulse' : ''}`}
                          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                        >
                          {!avatarUrl && (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-muted-foreground/30 text-center uppercase p-1">
                              Logo
                            </div>
                          )}
                        </div>
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" id="avatar-upload" />
                        <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow-lg cursor-pointer hover:scale-110 active:scale-90 transition-all border-2 border-background">
                          <Camera className="h-3.5 w-3.5" />
                        </label>
                      </div>

                      <div className="mt-4 text-center space-y-2 w-full px-4">
                        <h4 className={`text-2xl font-black text-foreground truncate ${!name ? 'text-muted-foreground/20' : ''}`}>
                          {name || "Triibe Name"}
                        </h4>
                        <div className="flex items-center justify-center gap-2">
                           <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                             {category}
                           </span>
                           {city && (
                             <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                               <MapPin className="h-2.5 w-2.5" /> {city}
                             </span>
                           )}
                        </div>
                        <p className={`text-[11px] leading-relaxed line-clamp-3 pt-1 ${!description ? 'text-muted-foreground/20' : 'text-muted-foreground'}`}>
                          {description || "A beautiful community waiting to be born. Your description will appear right here for all to see."}
                        </p>
                      </div>

                      <div className="mt-6 w-full pt-6 border-t border-border flex justify-center">
                         <div className="flex -space-x-2">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
                                <span className="text-[8px] font-black text-muted-foreground/50">U{i+1}</span>
                              </div>
                            ))}
                            <div className="h-8 w-8 rounded-full border-2 border-background bg-foreground/10 flex items-center justify-center">
                               <span className="text-[8px] font-black text-foreground">+1</span>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 flex gap-3">
                    <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed font-semibold">
                      Pro-tip: Groups with custom covers and clear logos receive 3x more join requests.
                    </p>
                  </div>

                  <Button 
                    disabled={!name || !!slugError || isCheckingSlug || createMutation.isPending} 
                    onClick={() => {
                      let hasError = false;
                      if (!coverUrl) { setCoverError(true); hasError = true; }
                      if (!avatarUrl) { setLogoError(true); hasError = true; }
                      if (hasError) return;
                      createMutation.mutate();
                    }}
                    className={`w-full rounded-2xl h-14 text-lg font-black shadow-xl transition-all duration-300 active:scale-95 ${
                      !name || !!slugError ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:opacity-90'
                    }`}
                  >
                    {createMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                        Incubating...
                      </span>
                    ) : "Launch Triibe"}
                  </Button>
                  
                  {(coverError || logoError) && (
                    <p className="text-center text-xs font-bold text-destructive animate-pulse">
                       {coverError && logoError ? "Both Cover & Logo required" : coverError ? "Cover image missing" : "Logo missing"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <div className="text-center px-4">
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                By launching, you agree to the Triibes community guidelines.
              </p>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </SimpleBackground>
  );
}
