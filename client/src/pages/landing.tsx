import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, DollarSign, MessageSquare, BarChart3, MapPin, Clock, Shield, Zap, Heart } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-primary/10">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-cyan-400 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold gradient-text">Tribbe</h1>
            </div>
            
            <Button onClick={handleLogin} className="gaming-button">
              Sign in with Google
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
              End WhatsApp Chaos
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              The ultimate event planning platform with smart RSVP tracking, automated reminders, 
              expense splitting, and built-in decision-making tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleLogin} size="lg" className="gaming-button text-lg px-8 py-4">
                <Zap className="mr-2 h-5 w-5" />
                Sign in with Google
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-primary/30 hover:border-primary">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-dark-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-lg text-muted-foreground">
              Comprehensive event planning tools that actually work
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="glass-effect hover:neon-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart RSVP Tracking</h3>
                <p className="text-muted-foreground">
                  Automated headcount with real-time updates. No more manual follow-ups or confusion.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect hover:neon-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Automated Reminders</h3>
                <p className="text-muted-foreground">
                  Smart notification system that reminds guests without spamming them.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect hover:neon-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-cyan-400 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Centralized Communication</h3>
                <p className="text-muted-foreground">
                  All event info in one place. No more scrolling through chat history.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect hover:neon-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Expense Splitting</h3>
                <p className="text-muted-foreground">
                  Fair and transparent cost sharing with automatic calculations.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect hover:neon-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Group Polls</h3>
                <p className="text-muted-foreground">
                  Built-in decision-making tools for time, location, and activity choices.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect hover:neon-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Location & Weather</h3>
                <p className="text-muted-foreground">
                  Integrated maps, directions, and automatic weather updates for outdoor events.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Event Types */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Perfect for Any Event</h2>
            <p className="text-lg text-muted-foreground">
              From gaming nights to birthday parties, we've got you covered
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="glass-effect group hover:scale-105 transition-all duration-300">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-blue-600/20 rounded-t-lg flex items-center justify-center">
                  <div className="text-6xl">🎮</div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2">Gaming Sessions</h3>
                  <p className="text-muted-foreground mb-4">
                    Coordinate online gaming sessions with platform hints, voice chat setup, and game selection polls.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Platform coordination (PC, Console, Mobile)</li>
                    <li>• Game selection polls</li>
                    <li>• Voice chat room setup</li>
                    <li>• Skill level matching</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect group hover:scale-105 transition-all duration-300">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-t-lg flex items-center justify-center">
                  <div className="text-6xl">🎉</div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2">Offline Parties</h3>
                  <p className="text-muted-foreground mb-4">
                    Plan in-person gatherings with location sharing, weather updates, and guest management.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Location sharing & directions</li>
                    <li>• Weather monitoring</li>
                    <li>• Plus-one management</li>
                    <li>• Photo collection</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-cyan-400/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Level Up Your Events?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of event planners who have eliminated the chaos
          </p>
          <Button onClick={handleLogin} size="lg" className="gaming-button text-lg px-8 py-4">
            <Heart className="mr-2 h-5 w-5" />
            Start Your First Event
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-border bg-dark-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-cyan-400 rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold gradient-text">Tribbe</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Tribbe. Made for event planners who demand better.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
