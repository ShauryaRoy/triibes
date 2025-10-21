import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, DollarSign, MessageSquare, BarChart3, MapPin, Clock, Shield, Zap, Heart } from "lucide-react";
import { SimpleBackground } from "@/components/simple-background";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <SimpleBackground className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-cyan-400/10" />
        
        <div className="container relative mx-auto px-4 pt-20 pb-32 sm:pt-28 sm:pb-40">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-block rounded-full bg-primary/10 px-4 py-2 backdrop-blur-sm border border-primary/20">
              <span className="text-sm font-semibold text-primary-foreground">
                🎉 Your Events, Perfectly Organized
              </span>
            </div>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Plan Amazing Events
              <br />
              <span className="brand-gradient bg-clip-text text-transparent">
                With Your Tribe
              </span>
            </h1>
            
            <p className="mb-10 text-lg text-white/80 sm:text-xl max-w-2xl mx-auto">
              Create, manage, and track events effortlessly. From guest lists to expenses, 
              everything you need in one beautiful platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={handleLogin}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:scale-105 transition-all min-w-[200px]"
              >
                <Shield className="mr-2 h-5 w-5" />
                Sign in with Google
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 min-w-[200px]"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
            Everything You Need for Perfect Events
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Powerful features designed to make event planning a breeze
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {/* Feature Cards */}
          <Card className="bg-white/5 backdrop-blur border-white/10 hover:border-primary/50 transition-all hover:scale-105">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Smart Scheduling</h3>
              <p className="text-white/70">
                Create events in seconds with our intuitive date and time picker
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur border-white/10 hover:border-primary/50 transition-all hover:scale-105">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex rounded-lg bg-cyan-500/10 p-3">
                <Users className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Guest Management</h3>
              <p className="text-white/70">
                Track RSVPs, manage guest lists, and send updates effortlessly
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur border-white/10 hover:border-primary/50 transition-all hover:scale-105">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex rounded-lg bg-pink-500/10 p-3">
                <DollarSign className="h-6 w-6 text-pink-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Expense Tracking</h3>
              <p className="text-white/70">
                Split costs fairly and keep track of who owes what
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur border-white/10 hover:border-primary/50 transition-all hover:scale-105">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex rounded-lg bg-purple-500/10 p-3">
                <MessageSquare className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Real-time Polls</h3>
              <p className="text-white/70">
                Let your guests vote on activities, dates, and more
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur border-white/10 hover:border-primary/50 transition-all hover:scale-105">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex rounded-lg bg-orange-500/10 p-3">
                <MapPin className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Location Sharing</h3>
              <p className="text-white/70">
                Share event locations with integrated map links
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur border-white/10 hover:border-primary/50 transition-all hover:scale-105">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex rounded-lg bg-green-500/10 p-3">
                <Shield className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Privacy Control</h3>
              <p className="text-white/70">
                Choose between public and private events with full control
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-br from-primary/20 to-cyan-400/10 border-primary/30 backdrop-blur">
          <CardContent className="p-8 md:p-12 text-center">
            <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Create Amazing Events?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of event organizers who trust Tribbe for their celebrations
            </p>
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:scale-105 transition-all"
            >
              <Shield className="mr-2 h-5 w-5" />
              Get Started Free
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-white/10">
        <div className="text-center text-white/60 text-sm">
          <p className="mb-2">© 2025 Tribbe. All rights reserved.</p>
          <div className="flex justify-center items-center gap-2">
            <Heart className="h-4 w-4 text-red-400" />
            <span>Made with love for event organizers</span>
          </div>
        </div>
      </footer>
    </SimpleBackground>
  );
}
