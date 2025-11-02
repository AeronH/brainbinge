import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const onboarding = requestUrl.searchParams.get('onboarding');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Check if user profile exists
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // If no profile exists, create one
      if (!profile) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata.name || data.user.user_metadata.full_name || '',
          preferences: {
            voice_style: 'freeman',
            humor_level: 'pg',
            theme: 'dark',
          },
        });
      }

      // Redirect to onboarding if new sign up, otherwise dashboard
      if (onboarding === 'true' || !profile) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
      
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/signin?error=auth_callback_error`);
}

