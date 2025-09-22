import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function CreateCommunity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [scope, setScope] = useState<"city" | "global">("city");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("general");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          description,
          category,
          // Optional: include settings like slug, location
          settings: {
            slug,
            scope,
            city,
            coverUrl,
            avatarUrl,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to create community");
      return res.json();
    },
    onSuccess: (community) => {
      toast({ title: "Community created", description: `${community.name} is live.` });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/communities"] });
      navigate(`/communities/${community.id}`);
    },
    onError: () => {
      toast({ title: "Creation failed", description: "Please sign in and try again.", variant: "destructive" });
    },
  });

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('Uploading cover file:', file.name, file.type, file.size);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      console.log('Upload response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Upload error:', errorData);
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await res.json();
      console.log('Upload success:', data);
      setCoverUrl(data.url);
      toast({ title: 'Cover uploaded', description: 'Cover image updated successfully.' });
    } catch (error) {
      console.error('Cover upload error:', error);
      toast({ title: 'Upload failed', description: `Could not upload cover image: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' });
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('Uploading logo file:', file.name, file.type, file.size);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      console.log('Upload response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Upload error:', errorData);
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await res.json();
      console.log('Upload success:', data);
      setAvatarUrl(data.url);
      toast({ title: 'Logo uploaded', description: 'Logo updated successfully.' });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({ title: 'Upload failed', description: `Could not upload logo: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 pt-24 pb-24">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Create Community</h1>
          </div>

          {/* Cover + Avatar */}
          <section>
            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/5">
              <div className="aspect-[3/1] w-full bg-white/5 flex items-center justify-center text-white/40" style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
                {!coverUrl && <span>Cover image</span>}
                <div className="absolute top-3 right-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label htmlFor="cover-upload">
                    <Button variant="secondary" className="bg-white/10 hover:bg-white/20 border border-white/20" asChild>
                      <span>Change Cover</span>
                    </Button>
                  </label>
                </div>
              </div>
              <div className="absolute -bottom-8 left-6">
                <div className="h-20 w-20 rounded-2xl border border-white/20 bg-white/10 overflow-hidden flex items-center justify-center text-white/60" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
                  {!avatarUrl && <span className="text-xs">Logo</span>}
                </div>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label htmlFor="avatar-upload">
                    <Button variant="outline" className="h-8 px-3 border-white/30 text-white bg-white/10 hover:bg-white/20" asChild>
                      <span>Change Logo</span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-12 grid gap-4">
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl" />
              <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl min-h-[120px]" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-xl">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-white hover:bg-white/10">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Location */}
          <section>
            <Card className="bg-white/5 border-white/15 rounded-2xl">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-white/80">URL Slug</p>
                    <div className="grid grid-cols-[auto,1fr] items-center gap-2">
                      <span className="text-white/60 text-sm bg-white/10 border border-white/15 px-3 py-2 rounded-l-xl">movo.app/c/</span>
                      <Input placeholder="your-community" value={slug} onChange={(e) => setSlug(e.target.value)} className="bg-white/10 border-white/15 text-white placeholder:text-white/50 rounded-r-xl" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-white/80">Location</p>
                    <div className="inline-flex rounded-xl overflow-hidden border border-white/20">
                      <button type="button" className={`px-4 py-2 text-sm ${scope === "city" ? "bg-white/20" : "bg-transparent"}`} onClick={() => setScope("city")}>City</button>
                      <button type="button" className={`px-4 py-2 text-sm ${scope === "global" ? "bg-white/20" : "bg-transparent"}`} onClick={() => setScope("global")}>Global</button>
                    </div>
                    {scope === "city" && (
                      <Input placeholder="Search city (e.g., Paris, France)" value={city} onChange={(e) => setCity(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="pt-2">
            <Button disabled={!name || createMutation.isPending} onClick={() => createMutation.mutate()} className="w-full rounded-xl h-12 text-base font-medium">
              {createMutation.isPending ? "Creating..." : "Create Community"}
            </Button>
          </div>

          <div className="text-center">
            <Link href="/communities" className="text-white/60 hover:text-white">Back to Communities</Link>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
