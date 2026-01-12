import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileText, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import simplifyLogo from "@/assets/simplify-logo.png";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read query parameters
  const modeParam = searchParams.get('mode'); // 'signup' or 'signin'
  const emailParam = searchParams.get('email') || '';
  const returnToParam = searchParams.get('returnTo') || '/';

  // Set default tab based on mode parameter
  const defaultTab = modeParam === 'signup' ? 'signup' : 'signin';

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // If returnTo is specified, redirect there after auth
        navigate(returnToParam);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // If returnTo is specified, redirect there after auth
        navigate(returnToParam);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, returnToParam]);

  const handleSignUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        setError('This email is already registered. Please try signing in instead.');
      } else {
        setError(error.message);
      }
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to complete your registration."
      });
    }

    setLoading(false);
  };

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else {
        setError(error.message);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center justify-center mb-4">
            <img src={simplifyLogo} alt="SimplifyAI DocFlow" className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to SimplifyAI DocFlow</h1>
          <p className="text-muted-foreground mt-2">Transform your documents into structured forms with AI</p>
        </div>

        <Card className="border-border bg-card">
          <Tabs defaultValue={defaultTab} className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            {error && (
              <CardContent className="pt-0">
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </CardContent>
            )}

            <TabsContent value="signin">
              <SignInForm onSubmit={handleSignIn} loading={loading} />
            </TabsContent>

            <TabsContent value="signup">
              <SignUpForm onSubmit={handleSignUp} loading={loading} initialEmail={emailParam} />
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

const SignInForm = ({ onSubmit, loading }: { onSubmit: (email: string, password: string) => void; loading: boolean }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Welcome back! Enter your credentials to access your account.
        </CardDescription>

        <div className="space-y-2">
          <Label htmlFor="signin-email">Email</Label>
          <Input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signin-password">Password</Label>
          <Input
            id="signin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={loading}
          />
        </div>
      </CardContent>

      <CardFooter>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign In
        </Button>
      </CardFooter>
    </form>
  );
};

const SignUpForm = ({ onSubmit, loading, initialEmail = '' }: { onSubmit: (email: string, password: string) => void; loading: boolean; initialEmail?: string }) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordError('');
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        <CardTitle>Create Account</CardTitle>
        <CardDescription>
          Join SimplifyAI DocFlow to start transforming your documents with AI.
        </CardDescription>

        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (min 6 characters)"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
            disabled={loading}
          />
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </CardFooter>
    </form>
  );
};

export default Auth;